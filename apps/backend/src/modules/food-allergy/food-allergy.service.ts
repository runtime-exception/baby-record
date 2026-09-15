import { Injectable } from '@nestjs/common';
import { AllergyConclusion, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { DateRangeUtil } from '../../common/utils/date-range.util';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateFoodAllergyDto } from './dto/create-food-allergy.dto';
import { UpdateFoodAllergyDto } from './dto/update-food-allergy.dto';
import { QueryFoodAllergyDto } from './dto/query-food-allergy.dto';
import {
  FoodAllergyObservations,
  positiveSymptomLabels,
  scoreAllergyObservations,
} from './allergy-score';

const includeRelations = {
  food: true,
  creator: { select: { id: true, name: true, role: true } },
} as const;
type AllergyWithRelations = Prisma.FoodAllergyRecordGetPayload<{ include: typeof includeRelations }>;

@Injectable()
export class FoodAllergyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFoodAllergyDto) {
    await this.ensureRefs(dto.babyId, dto.creatorId, dto.foodId);
    const observations = dto.observations as FoodAllergyObservations;
    const result = scoreAllergyObservations(observations);
    const record = await this.prisma.foodAllergyRecord.create({
      data: {
        babyId: dto.babyId,
        foodId: dto.foodId,
        exposureTime: new Date(dto.exposureTime),
        observations,
        systemScore: result.score,
        systemConclusion: result.conclusion as AllergyConclusion,
        finalConclusion: dto.finalConclusion,
        remark: dto.remark,
        creatorId: dto.creatorId,
      },
      include: includeRelations,
    });
    return this.toVo(record);
  }

  async update(id: number, dto: UpdateFoodAllergyDto) {
    const existing = await this.findRecord(id);
    if (dto.foodId !== undefined) await this.ensureFood(dto.foodId);
    const observations = (dto.observations ?? existing.observations) as FoodAllergyObservations;
    const result = scoreAllergyObservations(observations);
    const record = await this.prisma.foodAllergyRecord.update({
      where: { id },
      data: {
        ...(dto.foodId !== undefined && { foodId: dto.foodId }),
        ...(dto.exposureTime !== undefined && { exposureTime: new Date(dto.exposureTime) }),
        ...(dto.observations !== undefined && {
          observations,
          systemScore: result.score,
          systemConclusion: result.conclusion as AllergyConclusion,
        }),
        ...(dto.finalConclusion !== undefined && { finalConclusion: dto.finalConclusion }),
        ...(dto.remark !== undefined && { remark: dto.remark }),
      },
      include: includeRelations,
    });
    return this.toVo(record);
  }

  async findAll(query: QueryFoodAllergyDto) {
    const where: Prisma.FoodAllergyRecordWhereInput = { babyId: query.babyId };
    if (query.foodId) where.foodId = query.foodId;
    if (query.conclusion) where.finalConclusion = query.conclusion;
    if (query.startDate || query.endDate) {
      const range = DateRangeUtil.resolve('custom', query.startDate, query.endDate);
      where.exposureTime = { gte: range.start, lte: range.end };
    }
    const [list, total] = await Promise.all([
      this.prisma.foodAllergyRecord.findMany({
        where,
        include: includeRelations,
        orderBy: { exposureTime: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.foodAllergyRecord.count({ where }),
    ]);
    return new PaginatedResult(list.map((record) => this.toVo(record)), total, query.page, query.pageSize);
  }

  async findOne(id: number) {
    return this.toVo(await this.findRecord(id));
  }

  async remove(id: number): Promise<void> {
    await this.findRecord(id);
    await this.prisma.foodAllergyRecord.delete({ where: { id } });
  }

  private async findRecord(id: number): Promise<AllergyWithRelations> {
    const record = await this.prisma.foodAllergyRecord.findUnique({ where: { id }, include: includeRelations });
    if (!record) throw new BusinessException(ErrorCode.RECORD_NOT_FOUND, '排敏记录不存在');
    return record;
  }

  private async ensureRefs(babyId: number, creatorId: number, foodId: number) {
    const [baby, user] = await Promise.all([
      this.prisma.baby.findUnique({ where: { id: babyId }, select: { id: true } }),
      this.prisma.user.findUnique({ where: { id: creatorId }, select: { id: true } }),
    ]);
    if (!baby) throw new BusinessException(ErrorCode.BABY_NOT_FOUND);
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND);
    await this.ensureFood(foodId);
  }

  private async ensureFood(foodId: number) {
    const food = await this.prisma.food.findFirst({ where: { id: foodId, isActive: true }, select: { id: true } });
    if (!food) throw new BusinessException(ErrorCode.PARAM_INVALID, '辅食不存在或已停用');
  }

  private toVo(record: AllergyWithRelations) {
    const observations = record.observations as FoodAllergyObservations;
    return {
      ...record,
      observations,
      urgent: scoreAllergyObservations(observations).urgent,
      positiveSymptoms: positiveSymptomLabels(observations),
      exposureTime: record.exposureTime.toISOString(),
      createdTime: record.createdTime.toISOString(),
      updatedTime: record.updatedTime.toISOString(),
      food: {
        ...record.food,
        createdTime: record.food.createdTime.toISOString(),
        updatedTime: record.food.updatedTime.toISOString(),
      },
    };
  }
}
