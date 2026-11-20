import { validateExerciseAmount } from '../activity/exercise-rules';
import { Injectable } from '@nestjs/common';
import { ExerciseConfig } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { CreateExerciseConfigDto } from './dto/create-exercise-config.dto';
import { UpdateExerciseConfigDto } from './dto/update-exercise-config.dto';

export interface ExerciseConfigVo {
  id: number;
  name: string;
  emoji: string | null;
  defaultAmount: string | null;
  defaultUnit: string | null;
  isActive: boolean;
  createdTime: string;
  updatedTime: string;
}

@Injectable()
export class ExerciseConfigService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(babyId: number, includeInactive = false): Promise<ExerciseConfigVo[]> {
    return this.prisma.exerciseConfig
      .findMany({
        where: { babyId, ...(!includeInactive && { isActive: true }) },
        orderBy: { id: 'asc' },
      })
      .then((items) => items.map((item) => this.toVo(item)));
  }

  async create(babyId: number, dto: CreateExerciseConfigDto): Promise<ExerciseConfigVo> {
    const name = dto.name.trim();
    if (!name) throw new BusinessException(ErrorCode.PARAM_INVALID, '运动名称不能为空');
    const existing = await this.prisma.exerciseConfig.findUnique({ where: { babyId_name: { babyId, name } } });
    if (existing) throw new BusinessException(ErrorCode.PARAM_INVALID, '该运动已存在');
    const defaultAmount = dto.defaultAmount === undefined ? '1' : dto.defaultAmount;
    const defaultUnit = dto.defaultUnit === undefined ? '分钟' : dto.defaultUnit;
    validateExerciseAmount(defaultAmount, defaultUnit);
    const item = await this.prisma.exerciseConfig.create({
      data: {
        babyId,
        name,
        emoji: this.normalizeOptional(dto.emoji),
        defaultAmount: defaultAmount.trim(),
        defaultUnit,
      },
    });
    return this.toVo(item);
  }

  async update(babyId: number, id: number, dto: UpdateExerciseConfigDto): Promise<ExerciseConfigVo> {
    const existing = await this.findOne(babyId, id);
    validateExerciseAmount(dto.defaultAmount === undefined ? existing.defaultAmount : dto.defaultAmount, dto.defaultUnit === undefined ? existing.defaultUnit : dto.defaultUnit);
    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '运动名称不能为空');
    }
    if (name !== undefined) {
      const duplicate = await this.prisma.exerciseConfig.findUnique({ where: { babyId_name: { babyId, name } } });
      if (duplicate && duplicate.id !== id) {
        throw new BusinessException(ErrorCode.PARAM_INVALID, '该运动已存在');
      }
    }
    const item = await this.prisma.exerciseConfig.update({
      where: { id, babyId },
      data: {
        ...(name !== undefined && { name }),
        ...(dto.emoji !== undefined && { emoji: this.normalizeOptional(dto.emoji) }),
        ...(dto.defaultAmount !== undefined && { defaultAmount: dto.defaultAmount.trim() }),
        ...(dto.defaultUnit !== undefined && { defaultUnit: dto.defaultUnit }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
    return this.toVo(item);
  }

  async remove(babyId: number, id: number): Promise<void> {
    await this.findOne(babyId, id);
    await this.prisma.exerciseConfig.update({ where: { id, babyId }, data: { isActive: false } });
  }

  private async findOne(babyId: number, id: number): Promise<ExerciseConfig> {
    const item = await this.prisma.exerciseConfig.findUnique({ where: { id, babyId } });
    if (!item) throw new BusinessException(ErrorCode.RECORD_NOT_FOUND, '运动配置不存在');
    return item;
  }

  private normalizeOptional(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private toVo(item: ExerciseConfig): ExerciseConfigVo {
    return {
      ...item,
      createdTime: item.createdTime.toISOString(),
      updatedTime: item.updatedTime.toISOString(),
    };
  }
}
