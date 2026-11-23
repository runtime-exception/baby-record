import { Injectable } from '@nestjs/common';
import { Temperature, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { DateRangeUtil } from '../../common/utils/date-range.util';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateTemperatureDto } from './dto/create-temperature.dto';
import { UpdateTemperatureDto } from './dto/update-temperature.dto';
import { QueryTemperatureDto } from './dto/query-temperature.dto';

export interface TemperatureVo {
  id: number;
  babyId: string;
  temperature: number;
  measureTime: string;
  remark: string | null;
  creatorId: number;
  createdTime: string;
}

@Injectable()
export class TemperatureService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTemperatureDto): Promise<TemperatureVo> {
    await this.ensureRefs(dto.babyId, dto.creatorId);
    const t = await this.prisma.temperature.create({
      data: {
        babyId: dto.babyId,
        temperature: dto.temperature,
        measureTime: new Date(dto.measureTime),
        remark: dto.remark,
        creatorId: dto.creatorId,
      },
    });
    return this.toVo(t);
  }

  async findAll(query: QueryTemperatureDto): Promise<PaginatedResult<TemperatureVo>> {
    const where: Prisma.TemperatureWhereInput = { babyId: query.babyId };
    if (query.startDate || query.endDate) {
      const range = DateRangeUtil.resolve('custom', query.startDate, query.endDate);
      where.measureTime = { gte: range.start, lte: range.end };
    }
    const [list, total] = await Promise.all([
      this.prisma.temperature.findMany({
        where,
        orderBy: { measureTime: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.temperature.count({ where }),
    ]);
    return new PaginatedResult(list.map((t) => this.toVo(t)), total, query.page, query.pageSize);
  }

  /** 最新一次体温（供首页展示） */
  async findLatest(babyId: string): Promise<TemperatureVo | null> {
    const t = await this.prisma.temperature.findFirst({
      where: { babyId },
      orderBy: { measureTime: 'desc' },
    });
    return t ? this.toVo(t) : null;
  }

  async findOne(id: number): Promise<TemperatureVo> {
    const t = await this.prisma.temperature.findUnique({ where: { id } });
    if (!t) throw new BusinessException(ErrorCode.RECORD_NOT_FOUND);
    return this.toVo(t);
  }

  async update(id: number, dto: UpdateTemperatureDto): Promise<TemperatureVo> {
    await this.findOne(id);
    const t = await this.prisma.temperature.update({
      where: { id },
      data: {
        ...(dto.temperature !== undefined && { temperature: dto.temperature }),
        ...(dto.measureTime !== undefined && { measureTime: new Date(dto.measureTime) }),
        ...(dto.remark !== undefined && { remark: dto.remark }),
      },
    });
    return this.toVo(t);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.temperature.delete({ where: { id } });
  }

  async findByRange(babyId: string, start: Date, end: Date): Promise<Temperature[]> {
    return this.prisma.temperature.findMany({
      where: { babyId, measureTime: { gte: start, lte: end } },
      orderBy: { measureTime: 'desc' },
    });
  }

  private async ensureRefs(babyId: string, creatorId: number): Promise<void> {
    const baby = await this.prisma.baby.findUnique({ where: { id: babyId }, select: { id: true } });
    if (!baby) throw new BusinessException(ErrorCode.BABY_NOT_FOUND);
    const user = await this.prisma.user.findUnique({ where: { id: creatorId }, select: { id: true } });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND);
  }

  private toVo(t: Temperature): TemperatureVo {
    return {
      id: t.id,
      babyId: t.babyId,
      temperature: Number(t.temperature),
      measureTime: t.measureTime.toISOString(),
      remark: t.remark,
      creatorId: t.creatorId,
      createdTime: t.createdTime.toISOString(),
    };
  }
}
