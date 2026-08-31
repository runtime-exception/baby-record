import { Injectable } from '@nestjs/common';
import { GrowthRecord, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { DateRangeUtil } from '../../common/utils/date-range.util';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateGrowthDto } from './dto/create-growth.dto';
import { UpdateGrowthDto } from './dto/update-growth.dto';
import { QueryGrowthDto } from './dto/query-growth.dto';
import { GrowthStandardsService } from './growth-standards.service';

export interface GrowthVo {
  id: number;
  babyId: number;
  height: number | null;
  weight: number | null;
  headCircumference: number | null;
  measureTime: string;
  remark: string | null;
  creatorId: number;
  createdTime: string;
}

@Injectable()
export class GrowthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly standards: GrowthStandardsService,
  ) {}

  async create(dto: CreateGrowthDto): Promise<GrowthVo> {
    await this.ensureRefs(dto.babyId, dto.creatorId);
    if (dto.height === undefined && dto.weight === undefined) {
      throw new BusinessException(ErrorCode.PARAM_MISSING, '身高与体重至少填写一项');
    }
    const record = await this.prisma.growthRecord.create({
      data: {
        babyId: dto.babyId,
        height: dto.height,
        weight: dto.weight,
        headCircumference: dto.headCircumference,
        measureTime: new Date(dto.measureTime),
        remark: dto.remark,
        creatorId: dto.creatorId,
      },
    });
    return this.toVo(record);
  }

  async findAll(query: QueryGrowthDto): Promise<PaginatedResult<GrowthVo>> {
    const where: Prisma.GrowthRecordWhereInput = { babyId: query.babyId };
    if (query.startDate || query.endDate) {
      const range = DateRangeUtil.resolve('custom', query.startDate, query.endDate);
      where.measureTime = { gte: range.start, lte: range.end };
    }
    const [list, total] = await Promise.all([
      this.prisma.growthRecord.findMany({
        where,
        orderBy: { measureTime: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.growthRecord.count({ where }),
    ]);
    return new PaginatedResult(list.map((r) => this.toVo(r)), total, query.page, query.pageSize);
  }

  /** 最新一次测量（供首页展示，任一身高/体重） */
  async findLatest(babyId: number): Promise<GrowthVo | null> {
    const record = await this.prisma.growthRecord.findFirst({
      where: { babyId },
      orderBy: { measureTime: 'desc' },
    });
    return record ? this.toVo(record) : null;
  }

  async findOne(id: number): Promise<GrowthVo> {
    const record = await this.prisma.growthRecord.findUnique({ where: { id } });
    if (!record) throw new BusinessException(ErrorCode.RECORD_NOT_FOUND);
    return this.toVo(record);
  }

  async update(id: number, dto: UpdateGrowthDto): Promise<GrowthVo> {
    await this.findOne(id);
    const record = await this.prisma.growthRecord.update({
      where: { id },
      data: {
        ...(dto.height !== undefined && { height: dto.height }),
        ...(dto.weight !== undefined && { weight: dto.weight }),
        ...(dto.headCircumference !== undefined && { headCircumference: dto.headCircumference }),
        ...(dto.measureTime !== undefined && { measureTime: new Date(dto.measureTime) }),
        ...(dto.remark !== undefined && { remark: dto.remark }),
      },
    });
    return this.toVo(record);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.growthRecord.delete({ where: { id } });
  }

  /**
   * 身高/体重趋势：宝宝实测 + 同龄参考高位 P97 + 参考低位 P3，
   * 每个测量点附带所处区间百分比；无参考覆盖（>60 月龄）时参考值为 null。
   */
  async trend(babyId: number, metric: 'height' | 'weight') {
    const baby = await this.prisma.baby.findUnique({
      where: { id: babyId },
      select: { gender: true, birthday: true },
    });
    if (!baby) throw new BusinessException(ErrorCode.BABY_NOT_FOUND);

    const records = await this.prisma.growthRecord.findMany({
      where: { babyId },
      orderBy: { measureTime: 'asc' },
    });

    const points = records
      .map((record) => {
        const value = metric === 'height' ? Number(record.height) : Number(record.weight);
        const measureTime = record.measureTime;
        if (record[metric] === null || !Number.isFinite(value)) return null;
        const monthAge = this.standards.monthAgeAt(baby.birthday, measureTime);
        const refs = this.standards.findRefs(baby.gender, metric, monthAge);
        return {
          date: this.toDateString(measureTime),
          value: this.roundValue(value, metric),
          monthAge: Number(monthAge.toFixed(2)),
          low: refs ? this.roundValue(refs.low, metric) : null,
          high: refs ? this.roundValue(refs.high, metric) : null,
          percent: refs ? this.standards.percentBetween(value, refs.low, refs.high) : null,
        };
      })
      .filter((point): point is NonNullable<typeof point> => point !== null);

    return {
      metric,
      unit: metric === 'height' ? ('cm' as const) : ('kg' as const),
      xAxis: points.map((p) => p.date),
      actual: points.map((p) => p.value),
      low: points.map((p) => p.low),
      high: points.map((p) => p.high),
      points,
      latest: points.length ? points[points.length - 1] : null,
      sourceUrl: this.standards.sourceUrl,
    };
  }

  private async ensureRefs(babyId: number, creatorId: number): Promise<void> {
    const baby = await this.prisma.baby.findUnique({ where: { id: babyId }, select: { id: true } });
    if (!baby) throw new BusinessException(ErrorCode.BABY_NOT_FOUND);
    const user = await this.prisma.user.findUnique({ where: { id: creatorId }, select: { id: true } });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND);
  }

  private toVo(r: GrowthRecord): GrowthVo {
    return {
      id: r.id,
      babyId: r.babyId,
      height: r.height === null ? null : Number(r.height),
      weight: r.weight === null ? null : Number(r.weight),
      headCircumference: r.headCircumference === null ? null : Number(r.headCircumference),
      measureTime: r.measureTime.toISOString(),
      remark: r.remark,
      creatorId: r.creatorId,
      createdTime: r.createdTime.toISOString(),
    };
  }

  private roundValue(value: number, metric: 'height' | 'weight'): number {
    return Math.round(value * (metric === 'height' ? 10 : 100)) / (metric === 'height' ? 10 : 100);
  }

  private toDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}