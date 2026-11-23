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
  id: string;
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

  async update(id: string, dto: UpdateBabyDto): Promise<BabyVo> {
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

  async uploadAvatar(id: string, avatar: string): Promise<BabyVo> {
    await this.findOne(id);
    const baby = await this.prisma.baby.update({
      where: { id },
      data: { avatar },
    });
    return this.toVo(baby);
  }

  /** 删除宝宝及其全部关联记录（仅管理员可调用，由 AuthGuard 校验） */
  async remove(id: string): Promise<{ id: string }> {
    await this.findOne(id);
    await this.prisma.$transaction(async (db) => {
      // 辅食与喂食是多对多关系，且 Food 为 Restrict，先清理关联再删配置
      await db.feedingFood.deleteMany({
        where: { OR: [{ feeding: { babyId: id } }, { food: { babyId: id } }] },
      });
      await db.foodAllergyRecord.deleteMany({ where: { babyId: id } });
      await db.feeding.deleteMany({ where: { babyId: id } });
      await db.supplement.deleteMany({ where: { babyId: id } });
      await db.activity.deleteMany({ where: { babyId: id } });
      await db.diaper.deleteMany({ where: { babyId: id } });
      await db.sleep.deleteMany({ where: { babyId: id } });
      await db.temperature.deleteMany({ where: { babyId: id } });
      await db.growthRecord.deleteMany({ where: { babyId: id } });
      await db.medicalRecord.deleteMany({ where: { babyId: id } });
      await db.aiAnalysis.deleteMany({ where: { babyId: id } });
      await db.food.deleteMany({ where: { babyId: id } });
      await db.supplementConfig.deleteMany({ where: { babyId: id } });
      await db.exerciseConfig.deleteMany({ where: { babyId: id } });
      await db.babyMember.deleteMany({ where: { babyId: id } });
      await db.babyClaim.deleteMany({ where: { babyId: id } });
      await db.baby.delete({ where: { id } });
    });
    return { id };
  }

  async findAll(accountId: number) {
    const memberships = await this.prisma.babyMember.findMany({
      where: { accountId, status: 'APPROVED' },
      include: { baby: true },
      orderBy: { baby: { createdTime: 'asc' } },
    });
    return memberships.map(({ baby, name, role, isAdmin, creatorId }) => ({
      ...this.toVo(baby), membership: { name, role, isAdmin, creatorId },
    }));
  }

  async avatarContent(id: string) {
    const baby = await this.prisma.baby.findUnique({ where: { id }, select: { avatar: true } });
    const value = baby?.avatar ?? '';
    const data = /^data:image\/(jpeg|png|gif|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value);
    if (data) return { type: 'image/' + data[1], body: Buffer.from(data[2], 'base64') };
    const file = /^\/uploads\/([a-z0-9-]+\.(?:jpe?g|png|webp|gif))$/i.exec(value);
    if (file) return { filename: file[1] };
    throw new BusinessException(ErrorCode.RECORD_NOT_FOUND, '头像不存在');
  }

  async findOne(id: string): Promise<BabyVo> {
    const baby = await this.prisma.baby.findUnique({ where: { id } });
    if (!baby) throw new BusinessException(ErrorCode.BABY_NOT_FOUND);
    return this.toVo(baby);
  }

  /** 确保宝宝存在（供其他模块校验 babyId） */
  async ensureExists(id: string): Promise<void> {
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
      // 小程序 <image> 无法携带鉴权头，较小的 data URL 直接内联返回即可渲染，
      // 避免额外下载请求；过大的旧头像仍走接口，防止 setData 超出 1MB 限制。
      avatar: this.toAvatar(baby),
      createdTime: baby.createdTime.toISOString(),
      updatedTime: baby.updatedTime.toISOString(),
      age: AgeUtil.calc(baby.birthday),
    };
  }

  private toAvatar(baby: Baby): string | null {
    if (!baby.avatar) return null;
    if (baby.avatar.startsWith('data:image/') && baby.avatar.length <= 300_000) return baby.avatar;
    return `babies/${baby.id}/avatar?v=${baby.updatedTime.getTime()}`;
  }
}
