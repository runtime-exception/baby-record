import { Injectable } from '@nestjs/common';
import { Supplement, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { DateRangeUtil } from '../../common/utils/date-range.util';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateSupplementDto } from './dto/create-supplement.dto';
import { UpdateSupplementDto } from './dto/update-supplement.dto';
import { QuerySupplementDto } from './dto/query-supplement.dto';

export interface SupplementVo {
  id: number;
  babyId: string;
  name: string;
  amount: string | null;
  unit: string | null;
  takeTime: string;
  remark: string | null;
  creatorId: number;
  createdTime: string;
}

@Injectable()
export class SupplementService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSupplementDto): Promise<SupplementVo> {
    await this.ensureRefs(dto.babyId, dto.creatorId);
    const supplement = await this.prisma.supplement.create({
      data: {
        babyId: dto.babyId,
        name: dto.name,
        amount: dto.amount,
        unit: dto.unit,
        takeTime: new Date(dto.takeTime),
        remark: dto.remark,
        creatorId: dto.creatorId,
      },
    });
    return this.toVo(supplement);
  }

  async update(id: number, dto: UpdateSupplementDto): Promise<SupplementVo> {
    await this.findOne(id);
    const supplement = await this.prisma.supplement.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.takeTime !== undefined && { takeTime: new Date(dto.takeTime) }),
        ...(dto.remark !== undefined && { remark: dto.remark }),
      },
    });
    return this.toVo(supplement);
  }

  async findAll(query: QuerySupplementDto): Promise<PaginatedResult<SupplementVo>> {
    const where = this.buildWhere(query);
    const [list, total] = await Promise.all([
      this.prisma.supplement.findMany({
        where,
        orderBy: { takeTime: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.supplement.count({ where }),
    ]);
    return new PaginatedResult(list.map((s) => this.toVo(s)), total, query.page, query.pageSize);
  }

  async findOne(id: number): Promise<SupplementVo> {
    const supplement = await this.prisma.supplement.findUnique({ where: { id } });
    if (!supplement) throw new BusinessException(ErrorCode.RECORD_NOT_FOUND);
    return this.toVo(supplement);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.supplement.delete({ where: { id } });
  }

  async findByRange(babyId: string, start: Date, end: Date): Promise<Supplement[]> {
    return this.prisma.supplement.findMany({
      where: { babyId, takeTime: { gte: start, lte: end } },
      orderBy: { takeTime: 'desc' },
    });
  }

  private buildWhere(query: QuerySupplementDto): Prisma.SupplementWhereInput {
    const where: Prisma.SupplementWhereInput = { babyId: query.babyId };
    if (query.name) where.name = { contains: query.name };
    if (query.startDate || query.endDate) {
      const range = DateRangeUtil.resolve('custom', query.startDate, query.endDate);
      where.takeTime = { gte: range.start, lte: range.end };
    }
    return where;
  }

  private async ensureRefs(babyId: string, creatorId: number): Promise<void> {
    const baby = await this.prisma.baby.findUnique({ where: { id: babyId }, select: { id: true } });
    if (!baby) throw new BusinessException(ErrorCode.BABY_NOT_FOUND);
    const user = await this.prisma.user.findUnique({ where: { id: creatorId }, select: { id: true } });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND);
  }

  private toVo(s: Supplement): SupplementVo {
    return {
      id: s.id,
      babyId: s.babyId,
      name: s.name,
      amount: s.amount,
      unit: s.unit,
      takeTime: s.takeTime.toISOString(),
      remark: s.remark,
      creatorId: s.creatorId,
      createdTime: s.createdTime.toISOString(),
    };
  }
}
