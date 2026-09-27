import { Injectable } from '@nestjs/common';
import { SupplementConfig } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { CreateSupplementConfigDto } from './dto/create-supplement-config.dto';
import { UpdateSupplementConfigDto } from './dto/update-supplement-config.dto';

export interface SupplementConfigVo {
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
export class SupplementConfigService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false): Promise<SupplementConfigVo[]> {
    return this.prisma.supplementConfig
      .findMany({
        where: includeInactive ? undefined : { isActive: true },
        orderBy: { id: 'asc' },
      })
      .then((items) => items.map((item) => this.toVo(item)));
  }

  async create(dto: CreateSupplementConfigDto): Promise<SupplementConfigVo> {
    const name = dto.name.trim();
    if (!name) throw new BusinessException(ErrorCode.PARAM_INVALID, '补剂名称不能为空');
    const existing = await this.prisma.supplementConfig.findUnique({ where: { name } });
    if (existing) throw new BusinessException(ErrorCode.PARAM_INVALID, '该补剂已存在');
    const item = await this.prisma.supplementConfig.create({
      data: {
        name,
        emoji: this.normalizeOptional(dto.emoji),
        defaultAmount: this.normalizeOptional(dto.defaultAmount),
        defaultUnit: this.normalizeOptional(dto.defaultUnit),
      },
    });
    return this.toVo(item);
  }

  async update(id: number, dto: UpdateSupplementConfigDto): Promise<SupplementConfigVo> {
    await this.findOne(id);
    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '补剂名称不能为空');
    }
    if (name !== undefined) {
      const duplicate = await this.prisma.supplementConfig.findUnique({ where: { name } });
      if (duplicate && duplicate.id !== id) {
        throw new BusinessException(ErrorCode.PARAM_INVALID, '该补剂已存在');
      }
    }
    const item = await this.prisma.supplementConfig.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(dto.emoji !== undefined && { emoji: this.normalizeOptional(dto.emoji) }),
        ...(dto.defaultAmount !== undefined && {
          defaultAmount: this.normalizeOptional(dto.defaultAmount),
        }),
        ...(dto.defaultUnit !== undefined && { defaultUnit: this.normalizeOptional(dto.defaultUnit) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
    return this.toVo(item);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.supplementConfig.update({ where: { id }, data: { isActive: false } });
  }

  private async findOne(id: number): Promise<SupplementConfig> {
    const item = await this.prisma.supplementConfig.findUnique({ where: { id } });
    if (!item) throw new BusinessException(ErrorCode.RECORD_NOT_FOUND, '补剂配置不存在');
    return item;
  }

  private normalizeOptional(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private toVo(item: SupplementConfig): SupplementConfigVo {
    return {
      ...item,
      createdTime: item.createdTime.toISOString(),
      updatedTime: item.updatedTime.toISOString(),
    };
  }
}
