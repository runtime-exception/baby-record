import { Injectable } from '@nestjs/common';
import { Feeding, FeedingType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { DateRangeUtil } from '../../common/utils/date-range.util';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateFeedingDto } from './dto/create-feeding.dto';
import { UpdateFeedingDto } from './dto/update-feeding.dto';
import { QueryFeedingDto } from './dto/query-feeding.dto';

export interface FeedingVo {
  id: number;
  babyId: number;
  feedingTime: string;
  feedingType: string;
  amountMl: number | null;
  durationMinutes: number | null;
  remark: string | null;
  creatorId: number;
  createdTime: string;
  updatedTime: string;
  foods: {
    id: number;
    name: string;
    isActive: boolean;
    createdTime: string;
    updatedTime: string;
  }[];
}

const includeFoods = { foods: { include: { food: true } } } as const;
type FeedingWithFoods = Prisma.FeedingGetPayload<{ include: typeof includeFoods }>;

@Injectable()
export class FeedingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFeedingDto): Promise<FeedingVo> {
    await this.ensureRefs(dto.babyId, dto.creatorId);
    const foodIds = await this.validateFoods(dto.feedingType, dto.foodIds ?? []);
    const feeding = await this.prisma.feeding.create({
      data: {
        babyId: dto.babyId,
        feedingType: dto.feedingType,
        feedingTime: new Date(dto.feedingTime),
        amountMl: dto.feedingType === FeedingType.COMPLEMENTARY_FOOD ? null : dto.amountMl,
        durationMinutes: dto.durationMinutes,
        remark: dto.remark,
        creatorId: dto.creatorId,
        foods: { create: foodIds.map((foodId) => ({ foodId })) },
      },
      include: includeFoods,
    });
    return this.toVo(feeding);
  }

  async update(id: number, dto: UpdateFeedingDto): Promise<FeedingVo> {
    const existing = await this.findRecord(id);
    const feedingType = dto.feedingType ?? existing.feedingType;
    const requestedFoodIds = dto.foodIds ?? existing.foods.map((item) => item.foodId);
    const foodIds = await this.validateFoods(
      feedingType,
      requestedFoodIds,
      existing.foods.map((item) => item.foodId),
    );
    const feeding = await this.prisma.feeding.update({
      where: { id },
      data: {
        ...(dto.feedingType !== undefined && { feedingType: dto.feedingType }),
        ...(dto.feedingTime !== undefined && { feedingTime: new Date(dto.feedingTime) }),
        ...(feedingType === FeedingType.COMPLEMENTARY_FOOD
          ? { amountMl: null }
          : dto.amountMl !== undefined && { amountMl: dto.amountMl }),
        ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
        ...(dto.remark !== undefined && { remark: dto.remark }),
        foods: {
          deleteMany: {},
          create: foodIds.map((foodId) => ({ foodId })),
        },
      },
      include: includeFoods,
    });
    return this.toVo(feeding);
  }

  async findAll(query: QueryFeedingDto): Promise<PaginatedResult<FeedingVo>> {
    const where = this.buildWhere(query);
    const [list, total] = await Promise.all([
      this.prisma.feeding.findMany({
        where,
        orderBy: { feedingTime: 'desc' },
        skip: query.skip,
        take: query.take,
        include: includeFoods,
      }),
      this.prisma.feeding.count({ where }),
    ]);
    return new PaginatedResult(list.map((f) => this.toVo(f)), total, query.page, query.pageSize);
  }

  async findOne(id: number): Promise<FeedingVo> {
    return this.toVo(await this.findRecord(id));
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.feeding.delete({ where: { id } });
  }

  /** 时间范围内的喂养记录（供统计/聚合使用） */
  async findByRange(babyId: number, start: Date, end: Date): Promise<Feeding[]> {
    return this.prisma.feeding.findMany({
      where: {
        babyId,
        feedingTime: { gte: start, lte: end },
      },
      orderBy: { feedingTime: 'desc' },
    });
  }

  private buildWhere(query: QueryFeedingDto): Prisma.FeedingWhereInput {
    const where: Prisma.FeedingWhereInput = { babyId: query.babyId };
    if (query.feedingType) where.feedingType = query.feedingType;
    if (query.startDate || query.endDate) {
      const range = DateRangeUtil.resolve(
        'custom',
        query.startDate,
        query.endDate,
      );
      where.feedingTime = { gte: range.start, lte: range.end };
    }
    return where;
  }

  private async ensureRefs(babyId: number, creatorId: number): Promise<void> {
    const baby = await this.prisma.baby.findUnique({ where: { id: babyId }, select: { id: true } });
    if (!baby) throw new BusinessException(ErrorCode.BABY_NOT_FOUND);
    const user = await this.prisma.user.findUnique({ where: { id: creatorId }, select: { id: true } });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND);
  }

  private async findRecord(id: number): Promise<FeedingWithFoods> {
    const feeding = await this.prisma.feeding.findUnique({ where: { id }, include: includeFoods });
    if (!feeding) throw new BusinessException(ErrorCode.RECORD_NOT_FOUND);
    return feeding;
  }

  private async validateFoods(
    feedingType: FeedingType,
    requestedFoodIds: number[],
    existingFoodIds: number[] = [],
  ): Promise<number[]> {
    const acceptsFoods =
      feedingType === FeedingType.COMPLEMENTARY_FOOD || feedingType === FeedingType.MIXED;
    if (!acceptsFoods && requestedFoodIds.length) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '该喂养类型不能添加辅食');
    }
    if (feedingType === FeedingType.COMPLEMENTARY_FOOD && !requestedFoodIds.length) {
      throw new BusinessException(ErrorCode.PARAM_MISSING, '请选择至少一种辅食');
    }
    if (!requestedFoodIds.length) return [];
    const count = await this.prisma.food.count({
      where: {
        id: { in: requestedFoodIds },
        OR: [{ isActive: true }, { id: { in: existingFoodIds } }],
      },
    });
    if (count !== requestedFoodIds.length) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '辅食不存在或已停用');
    }
    return requestedFoodIds;
  }

  private toVo(f: FeedingWithFoods): FeedingVo {
    return {
      id: f.id,
      babyId: f.babyId,
      feedingTime: f.feedingTime.toISOString(),
      feedingType: f.feedingType,
      amountMl: f.amountMl,
      durationMinutes: f.durationMinutes,
      remark: f.remark,
      creatorId: f.creatorId,
      createdTime: f.createdTime.toISOString(),
      updatedTime: f.updatedTime.toISOString(),
      foods: f.foods.map(({ food }) => ({
        ...food,
        createdTime: food.createdTime.toISOString(),
        updatedTime: food.updatedTime.toISOString(),
      })),
    };
  }
}
