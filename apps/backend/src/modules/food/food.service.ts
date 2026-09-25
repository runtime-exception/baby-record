import { Injectable } from '@nestjs/common';
import { Food } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';

export interface FoodVo {
  id: number;
  name: string;
  emoji: string | null;
  isActive: boolean;
  createdTime: string;
  updatedTime: string;
}

@Injectable()
export class FoodService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false): Promise<FoodVo[]> {
    return this.prisma.food
      .findMany({
        where: includeInactive ? undefined : { isActive: true },
        orderBy: { id: 'asc' },
      })
      .then((foods) => foods.map((food) => this.toVo(food)));
  }

  async create(dto: CreateFoodDto): Promise<FoodVo> {
    const name = dto.name.trim();
    if (!name) throw new BusinessException(ErrorCode.PARAM_INVALID, '辅食名称不能为空');
    const existing = await this.prisma.food.findUnique({ where: { name } });
    if (existing) throw new BusinessException(ErrorCode.PARAM_INVALID, '该辅食已存在');
    const emoji = this.normalizeEmoji(dto.emoji);
    return this.toVo(await this.prisma.food.create({ data: { name, emoji } }));
  }

  async update(id: number, dto: UpdateFoodDto): Promise<FoodVo> {
    await this.findOne(id);
    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '辅食名称不能为空');
    }
    const food = await this.prisma.food.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(dto.emoji !== undefined && { emoji: this.normalizeEmoji(dto.emoji) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
    return this.toVo(food);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.food.update({ where: { id }, data: { isActive: false } });
  }

  private async findOne(id: number): Promise<Food> {
    const food = await this.prisma.food.findUnique({ where: { id } });
    if (!food) throw new BusinessException(ErrorCode.RECORD_NOT_FOUND, '辅食不存在');
    return food;
  }

  /** 空字符串统一存成 null，表示按名称自动推断图标 */
  private normalizeEmoji(emoji?: string | null): string | null {
    const trimmed = emoji?.trim();
    return trimmed ? trimmed : null;
  }

  private toVo(food: Food): FoodVo {
    return {
      ...food,
      createdTime: food.createdTime.toISOString(),
      updatedTime: food.updatedTime.toISOString(),
    };
  }
}
