import { preferredExercise, validateExerciseAmount } from './exercise-rules';
import { Injectable } from '@nestjs/common';
import { Activity, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { DateRangeUtil } from '../../common/utils/date-range.util';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { QueryActivityDto } from './dto/query-activity.dto';

export interface ActivityVo {
  id: number;
  babyId: number;
  eventType: string;
  exerciseTypes: string[];
  amount: string | null;
  unit: string | null;
  eventTime: string;
  description: string | null;
  remark: string | null;
  creatorId: number;
  createdTime: string;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateActivityDto): Promise<ActivityVo> {
    await this.ensureRefs(dto.babyId, dto.creatorId);
    const exercise = await this.exerciseData(dto);
    const activity = await this.prisma.activity.create({
      data: {
        ...exercise,
        babyId: dto.babyId,
        eventType: dto.eventType,
        eventTime: new Date(dto.eventTime),
        description: dto.description,
        remark: dto.remark,
        creatorId: dto.creatorId,
      },
    });
    return this.toVo(activity);
  }

  async update(id: number, dto: UpdateActivityDto): Promise<ActivityVo> {
    const existing = await this.findOne(id);
    const exercise = await this.exerciseData(dto, existing);
    const activity = await this.prisma.activity.update({
      where: { id },
      data: {
        ...exercise,
        ...(dto.eventType !== undefined && { eventType: dto.eventType }),
        ...(dto.eventTime !== undefined && { eventTime: new Date(dto.eventTime) }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.remark !== undefined && { remark: dto.remark }),
      },
    });
    return this.toVo(activity);
  }

  async findAll(query: QueryActivityDto): Promise<PaginatedResult<ActivityVo>> {
    const where = this.buildWhere(query);
    const [list, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        orderBy: { eventTime: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.activity.count({ where }),
    ]);
    return new PaginatedResult(list.map((a) => this.toVo(a)), total, query.page, query.pageSize);
  }

  async findOne(id: number): Promise<ActivityVo> {
    const activity = await this.prisma.activity.findUnique({ where: { id } });
    if (!activity) throw new BusinessException(ErrorCode.RECORD_NOT_FOUND);
    return this.toVo(activity);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.activity.delete({ where: { id } });
  }

  async findByRange(babyId: number, start: Date, end: Date): Promise<Activity[]> {
    return this.prisma.activity.findMany({
      where: { babyId, eventTime: { gte: start, lte: end } },
      orderBy: { eventTime: 'desc' },
    });
  }

  private async exerciseData(dto: UpdateActivityDto, existing?: ActivityVo) {
    if ((dto.eventType ?? existing?.eventType) !== '运动') {
      return { exerciseTypes: [], amount: null, unit: null };
    }
    const names = dto.exerciseTypes ?? existing?.exerciseTypes ?? [];
    if (!names.length || names.some((name) => !name.trim()) || new Set(names).size !== names.length) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '请至少选择一种运动，不能重复');
    }
    const configs = await this.prisma.exerciseConfig.findMany({ where: { name: { in: names } } });
    const selected = names.map((name) => {
      const config = configs.find((item) => item.name === name);
      if (config?.isActive) return config;
      if (existing?.exerciseTypes.includes(name)) {
        return { defaultUnit: existing.unit ?? config?.defaultUnit ?? '分钟' };
      }
      throw new BusinessException(ErrorCode.PARAM_INVALID, `运动“${name}”不存在或已停用`);
    });
    const unchanged = existing && JSON.stringify(names) === JSON.stringify(existing.exerciseTypes);
    const preferredUnit = preferredExercise(selected).defaultUnit;
    const unit = unchanged && existing.unit && (dto.unit == null || dto.unit === existing.unit) ? existing.unit : preferredUnit;
    const amount = dto.amount !== undefined ? dto.amount : existing?.amount;
    // 迁移后的旧记录没有数量，允许继续只修改时间和描述。
    if (unchanged && existing.amount === null && amount == null) {
      return { exerciseTypes: names, amount: null, unit: null };
    }
    validateExerciseAmount(amount, unit);
    if (dto.unit != null && dto.unit !== unit) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '运动单位与所选运动不一致，时间单位优先');
    }
    return { exerciseTypes: names, amount: amount.trim(), unit };
  }

  private buildWhere(query: QueryActivityDto): Prisma.ActivityWhereInput {
    const where: Prisma.ActivityWhereInput = { babyId: query.babyId };
    if (query.eventType) where.eventType = { contains: query.eventType };
    if (query.startDate || query.endDate) {
      const range = DateRangeUtil.resolve('custom', query.startDate, query.endDate);
      where.eventTime = { gte: range.start, lte: range.end };
    }
    return where;
  }

  private async ensureRefs(babyId: number, creatorId: number): Promise<void> {
    const baby = await this.prisma.baby.findUnique({ where: { id: babyId }, select: { id: true } });
    if (!baby) throw new BusinessException(ErrorCode.BABY_NOT_FOUND);
    const user = await this.prisma.user.findUnique({ where: { id: creatorId }, select: { id: true } });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND);
  }

  private toVo(a: Activity): ActivityVo {
    return {
      id: a.id,
      babyId: a.babyId,
      eventType: a.eventType,
      exerciseTypes: a.exerciseTypes,
      amount: a.amount,
      unit: a.unit,
      eventTime: a.eventTime.toISOString(),
      description: a.description,
      remark: a.remark,
      creatorId: a.creatorId,
      createdTime: a.createdTime.toISOString(),
    };
  }
}
