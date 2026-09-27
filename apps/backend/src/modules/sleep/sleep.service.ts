import { Injectable } from '@nestjs/common';
import { Sleep, SleepType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { DateRangeUtil } from '../../common/utils/date-range.util';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateSleepDto } from './dto/create-sleep.dto';
import { UpdateSleepDto } from './dto/update-sleep.dto';
import { StartSleepDto } from './dto/start-sleep.dto';
import { EndSleepDto } from './dto/end-sleep.dto';
import { QuerySleepDto } from './dto/query-sleep.dto';
import { calculateSleepDurationMinutes, resolveSleepType } from './sleep-rules';

export interface SleepVo {
  id: number;
  babyId: number;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  sleepType: string;
  ongoing: boolean;
  remark: string | null;
  creatorId: number;
  createdTime: string;
}

@Injectable()
export class SleepService {
  constructor(private readonly prisma: PrismaService) {}

  /** 完整创建（可录入一段已结束的睡眠） */
  async create(dto: CreateSleepDto): Promise<SleepVo> {
    await this.ensureRefs(dto.babyId, dto.creatorId);
    const startTime = new Date(dto.startTime);
    const endTime = dto.endTime ? new Date(dto.endTime) : null;
    const durationMinutes = endTime ? calculateSleepDurationMinutes(startTime, endTime) : null;
    const sleep = await this.prisma.sleep.create({
      data: {
        babyId: dto.babyId,
        sleepType: dto.sleepType ?? resolveSleepType(startTime),
        startTime,
        endTime,
        durationMinutes,
        remark: dto.remark,
        creatorId: dto.creatorId,
      },
    });
    return this.toVo(sleep);
  }

  /** 开始睡眠：创建进行中记录 */
  async start(dto: StartSleepDto): Promise<SleepVo> {
    await this.ensureRefs(dto.babyId, dto.creatorId);
    const ongoing = await this.prisma.sleep.findFirst({
      where: { babyId: dto.babyId, endTime: null },
    });
    if (ongoing) throw new BusinessException(ErrorCode.SLEEP_ALREADY_ONGOING);

    const sleep = await this.prisma.sleep.create({
      data: {
        babyId: dto.babyId,
        sleepType: dto.sleepType ?? SleepType.DAYTIME,
        startTime: dto.startTime ? new Date(dto.startTime) : new Date(),
        remark: dto.remark,
        creatorId: dto.creatorId,
      },
    });
    return this.toVo(sleep);
  }

  /** 结束睡眠：回填结束时间与时长 */
  async end(id: number, dto: EndSleepDto): Promise<SleepVo> {
    const sleep = await this.prisma.sleep.findUnique({ where: { id } });
    if (!sleep) throw new BusinessException(ErrorCode.SLEEP_NOT_FOUND);
    if (sleep.endTime) throw new BusinessException(ErrorCode.SLEEP_ALREADY_ENDED);

    const endTime = dto.endTime ? new Date(dto.endTime) : new Date();
    const durationMinutes = calculateSleepDurationMinutes(sleep.startTime, endTime);
    const updated = await this.prisma.sleep.update({
      where: { id },
      data: {
        endTime,
        durationMinutes,
        ...(dto.remark !== undefined && { remark: dto.remark }),
      },
    });
    return this.toVo(updated);
  }

  async update(id: number, dto: UpdateSleepDto): Promise<SleepVo> {
    const current = await this.prisma.sleep.findUnique({ where: { id } });
    if (!current) throw new BusinessException(ErrorCode.RECORD_NOT_FOUND);
    const data: Prisma.SleepUpdateInput = {};
    if (dto.sleepType !== undefined) data.sleepType = dto.sleepType;
    if (dto.startTime !== undefined) data.startTime = new Date(dto.startTime);
    if (dto.remark !== undefined) data.remark = dto.remark;
    if (dto.endTime !== undefined) data.endTime = dto.endTime ? new Date(dto.endTime) : null;
    if (dto.startTime !== undefined || dto.endTime !== undefined) {
      const finalStart = dto.startTime ? new Date(dto.startTime) : current.startTime;
      const finalEnd = dto.endTime === undefined
        ? current.endTime
        : dto.endTime
          ? new Date(dto.endTime)
          : null;
      data.durationMinutes = finalEnd
        ? calculateSleepDurationMinutes(finalStart, finalEnd)
        : null;
    }
    const sleep = await this.prisma.sleep.update({ where: { id }, data });
    return this.toVo(sleep);
  }

  async findAll(query: QuerySleepDto): Promise<PaginatedResult<SleepVo>> {
    const where = this.buildWhere(query);
    const [list, total] = await Promise.all([
      this.prisma.sleep.findMany({
        where,
        orderBy: { startTime: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.sleep.count({ where }),
    ]);
    return new PaginatedResult(list.map((s) => this.toVo(s)), total, query.page, query.pageSize);
  }

  async findOne(id: number): Promise<SleepVo> {
    const sleep = await this.prisma.sleep.findUnique({ where: { id } });
    if (!sleep) throw new BusinessException(ErrorCode.RECORD_NOT_FOUND);
    return this.toVo(sleep);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.sleep.delete({ where: { id } });
  }

  async findByRange(babyId: number, start: Date, end: Date): Promise<Sleep[]> {
    return this.prisma.sleep.findMany({
      where: { babyId, startTime: { gte: start, lte: end } },
      orderBy: { startTime: 'desc' },
    });
  }

  private buildWhere(query: QuerySleepDto): Prisma.SleepWhereInput {
    const where: Prisma.SleepWhereInput = { babyId: query.babyId };
    if (query.sleepType) where.sleepType = query.sleepType;
    if (query.ongoing === true) where.endTime = null;
    else if (query.ongoing === false) where.endTime = { not: null };
    if (query.startDate || query.endDate) {
      const range = DateRangeUtil.resolve('custom', query.startDate, query.endDate);
      where.startTime = { gte: range.start, lte: range.end };
    }
    return where;
  }

  private async ensureRefs(babyId: number, creatorId: number): Promise<void> {
    const baby = await this.prisma.baby.findUnique({ where: { id: babyId }, select: { id: true } });
    if (!baby) throw new BusinessException(ErrorCode.BABY_NOT_FOUND);
    const user = await this.prisma.user.findUnique({ where: { id: creatorId }, select: { id: true } });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND);
  }

  private toVo(s: Sleep): SleepVo {
    return {
      id: s.id,
      babyId: s.babyId,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime ? s.endTime.toISOString() : null,
      durationMinutes: s.durationMinutes,
      sleepType: s.sleepType,
      ongoing: s.endTime === null,
      remark: s.remark,
      creatorId: s.creatorId,
      createdTime: s.createdTime.toISOString(),
    };
  }
}
