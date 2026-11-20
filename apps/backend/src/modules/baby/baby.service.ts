import { Injectable } from '@nestjs/common';
import { Baby } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AgeUtil, AgeInfo } from '../../common/utils/age.util';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { createMembership } from '../family/family.service';
import { initializeBabyConfigs } from '../family/default-configs';
import { CreateFamilyBabyDto } from './dto/create-baby.dto';
import { UpdateBabyDto } from './dto/update-baby.dto';

/** 序列化后的宝宝信息（Decimal -> number + age） */
export interface BabyVo {
  id: number;
  name: string;
  nickname: string | null;
  gender: string;
  birthday: string;
  birthWeight: number | null;
  birthHeight: number | null;
  headCircumference: number | null;
  birthHospital: string | null;
  remark: string | null;
  avatar: string | null;
  createdTime: string;
  updatedTime: string;
  age: AgeInfo;
}

@Injectable()
export class BabyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(accountId: number, dto: CreateFamilyBabyDto): Promise<BabyVo> {
    const baby = await this.prisma.$transaction(async (db) => {
      const created = await db.baby.create({
        data: {
          name: dto.name,
          nickname: dto.nickname,
          gender: dto.gender,
          birthday: new Date(dto.birthday),
          birthWeight: dto.birthWeight,
          birthHeight: dto.birthHeight,
          headCircumference: dto.headCircumference,
          birthHospital: dto.birthHospital,
          remark: dto.remark,
        },
      });
      await createMembership(db, accountId, created.id, dto);
      await initializeBabyConfigs(db, created.id);
      return created;
    });
    return this.toVo(baby);
  }

  async update(id: number, dto: UpdateBabyDto): Promise<BabyVo> {
    await this.findOne(id);
    const baby = await this.prisma.baby.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.nickname !== undefined && { nickname: dto.nickname }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.birthday !== undefined && { birthday: new Date(dto.birthday) }),
        ...(dto.birthWeight !== undefined && { birthWeight: dto.birthWeight }),
        ...(dto.birthHeight !== undefined && { birthHeight: dto.birthHeight }),
        ...(dto.headCircumference !== undefined && { headCircumference: dto.headCircumference }),
        ...(dto.birthHospital !== undefined && { birthHospital: dto.birthHospital }),
        ...(dto.remark !== undefined && { remark: dto.remark }),
      },
    });
    return this.toVo(baby);
  }

  async uploadAvatar(id: number, avatar: string): Promise<BabyVo> {
    await this.findOne(id);
    const baby = await this.prisma.baby.update({
      where: { id },
      data: { avatar },
    });
    return this.toVo(baby);
  }

  async findAll(accountId: number) {
    const memberships = await this.prisma.babyMember.findMany({
      where: { accountId, status: 'APPROVED' },
      include: { baby: true },
      orderBy: { babyId: 'asc' },
    });
    return memberships.map(({ baby, name, role, isAdmin, creatorId }) => ({
      ...this.toVo(baby), membership: { name, role, isAdmin, creatorId },
    }));
  }

  async avatarContent(id: number) {
    const baby = await this.prisma.baby.findUnique({ where: { id }, select: { avatar: true } });
    const value = baby?.avatar ?? '';
    const data = /^data:image\/(jpeg|png|gif|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value);
    if (data) return { type: 'image/' + data[1], body: Buffer.from(data[2], 'base64') };
    const file = /^\/uploads\/([a-z0-9-]+\.(?:jpe?g|png|webp|gif))$/i.exec(value);
    if (file) return { filename: file[1] };
    throw new BusinessException(ErrorCode.RECORD_NOT_FOUND, '头像不存在');
  }

  async findOne(id: number): Promise<BabyVo> {
    const baby = await this.prisma.baby.findUnique({ where: { id } });
    if (!baby) throw new BusinessException(ErrorCode.BABY_NOT_FOUND);
    return this.toVo(baby);
  }

  /** 确保宝宝存在（供其他模块校验 babyId） */
  async ensureExists(id: number): Promise<void> {
    const baby = await this.prisma.baby.findUnique({ where: { id }, select: { id: true } });
    if (!baby) throw new BusinessException(ErrorCode.BABY_NOT_FOUND);
  }

  private toVo(baby: Baby): BabyVo {
    return {
      id: baby.id,
      name: baby.name,
      nickname: baby.nickname,
      gender: baby.gender,
      birthday: baby.birthday.toISOString().slice(0, 10),
      birthWeight: baby.birthWeight !== null ? Number(baby.birthWeight) : null,
      birthHeight: baby.birthHeight !== null ? Number(baby.birthHeight) : null,
      headCircumference: baby.headCircumference !== null ? Number(baby.headCircumference) : null,
      birthHospital: baby.birthHospital,
      remark: baby.remark,
      avatar: baby.avatar ? `babies/${baby.id}/avatar?v=${baby.updatedTime.getTime()}` : null,
      createdTime: baby.createdTime.toISOString(),
      updatedTime: baby.updatedTime.toISOString(),
      age: AgeUtil.calc(baby.birthday),
    };
  }
}
