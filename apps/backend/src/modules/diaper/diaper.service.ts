import { Injectable } from '@nestjs/common';
import { Diaper, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { DateRangeUtil } from '../../common/utils/date-range.util';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateDiaperDto } from './dto/create-diaper.dto';
import { UpdateDiaperDto } from './dto/update-diaper.dto';
import { QueryDiaperDto } from './dto/query-diaper.dto';

export interface DiaperVo {
  id: number;
  babyId: string;
  changeTime: string;
  type: string;
  remark: string | null;
  creatorId: number;
  createdTime: string;
}

@Injectable()
export class DiaperService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDiaperDto): Promise<DiaperVo> {
    await this.ensureRefs(dto.babyId, dto.creatorId);
    const diaper = await this.prisma.diaper.create({
      data: {
        babyId: dto.babyId,
        type: dto.type,
        changeTime: new Date(dto.changeTime),
        remark: dto.remark,
        creatorId: dto.creatorId,
      },
    });
    return this.toVo(diaper);
  }

  async update(id: number, dto: UpdateDiaperDto): Promise<DiaperVo> {
    await this.findOne(id);
    const diaper = await this.prisma.diaper.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.changeTime !== undefined && { changeTime: new Date(dto.changeTime) }),
        ...(dto.remark !== undefined && { remark: dto.remark }),
      },
    });
    return this.toVo(diaper);
  }

  async findAll(query: QueryDiaperDto): Promise<PaginatedResult<DiaperVo>> {
    const where = this.buildWhere(query);
    const [list, total] = await Promise.all([
      this.prisma.diaper.findMany({
        where,
        orderBy: { changeTime: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.diaper.count({ where }),
    ]);
    return new PaginatedResult(list.map((d) => this.toVo(d)), total, query.page, query.pageSize);
  }

  async findOne(id: number): Promise<DiaperVo> {
    const diaper = await this.prisma.diaper.findUnique({ where: { id } });
    if (!diaper) throw new BusinessException(ErrorCode.RECORD_NOT_FOUND);
    return this.toVo(diaper);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.diaper.delete({ where: { id } });
  }

  async findByRange(babyId: string, start: Date, end: Date): Promise<Diaper[]> {
    return this.prisma.diaper.findMany({
      where: { babyId, changeTime: { gte: start, lte: end } },
      orderBy: { changeTime: 'desc' },
    });
  }

  private buildWhere(query: QueryDiaperDto): Prisma.DiaperWhereInput {
    const where: Prisma.DiaperWhereInput = { babyId: query.babyId };
    if (query.type) where.type = query.type;
    if (query.startDate || query.endDate) {
      const range = DateRangeUtil.resolve('custom', query.startDate, query.endDate);
      where.changeTime = { gte: range.start, lte: range.end };
    }
    return where;
  }

  private async ensureRefs(babyId: string, creatorId: number): Promise<void> {
    const baby = await this.prisma.baby.findUnique({ where: { id: babyId }, select: { id: true } });
    if (!baby) throw new BusinessException(ErrorCode.BABY_NOT_FOUND);
    const user = await this.prisma.user.findUnique({ where: { id: creatorId }, select: { id: true } });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND);
  }

  private toVo(d: Diaper): DiaperVo {
    return {
      id: d.id,
      babyId: d.babyId,
      changeTime: d.changeTime.toISOString(),
      type: d.type,
      remark: d.remark,
      creatorId: d.creatorId,
      createdTime: d.createdTime.toISOString(),
    };
  }
}
