import { Injectable } from '@nestjs/common';
import { Prisma, MembershipStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { parseBabyId } from '../../common/utils/baby-id.util';
import { secretHash } from '../auth/auth.service';
import { canAccessBaby } from '../auth/family-scope';
import { ApplyDto, ClaimDto, FamilyIdentityDto } from './identity.dto';
import { initializeBabyConfigs } from './default-configs';

const publicMember = { accountId: true, name: true, role: true, status: true, isAdmin: true, updatedAt: true };

const roleNames: Record<UserRole, string> = {
  DAD: '爸爸',
  MOM: '妈妈',
  GRANDPA_P: '爷爷',
  GRANDMA_P: '奶奶',
  GRANDMA_M: '姥姥',
  GRANDPA_M: '姥爷',
};

type MemberDb = Pick<Prisma.TransactionClient, 'babyMember'>;

/** 未填写显示名时沿用该账户已有的家庭身份，首次使用则以关系作为显示名 */
async function resolveMemberName(db: MemberDb, accountId: number, identity: FamilyIdentityDto) {
  const provided = identity.memberName?.trim();
  if (provided) return provided;
  const previous = await db.babyMember.findFirst({
    where: { accountId, name: { not: '' } },
    orderBy: { updatedAt: 'desc' },
    select: { name: true },
  });
  return previous?.name.trim() || roleNames[identity.role];
}

export async function createMembership(
  db: Prisma.TransactionClient, accountId: number, babyId: string, identity: FamilyIdentityDto,
) {
  const name = await resolveMemberName(db, accountId, identity);
  const creator = await db.user.create({ data: { name, role: identity.role } });
  return db.babyMember.upsert({
    where: { accountId_babyId: { accountId, babyId } },
    create: { accountId, babyId, creatorId: creator.id, name, role: identity.role, status: 'APPROVED', isAdmin: true },
    update: { creatorId: creator.id, name, role: identity.role, status: 'APPROVED', isAdmin: true },
  });
}

@Injectable()
export class FamilyService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(accountId: number, dto: ApplyDto) {
    const { role } = dto;
    const babyId = parseBabyId(dto.babyId);
    if (await this.prisma.babyMember.count({ where: { babyId, status: 'APPROVED', isAdmin: true } })) {
      const name = await resolveMemberName(this.prisma, accountId, dto);
      await this.prisma.$transaction(async (db) => {
        await db.babyMember.createMany({
          data: { accountId, babyId, role, name, status: 'PENDING' },
          skipDuplicates: true,
        });
        await db.babyMember.updateMany({
          where: { accountId, babyId, status: { in: ['REJECTED', 'REMOVED'] } },
          data: { role, name, status: 'PENDING' },
        });
      });
    }
    return { submitted: true };
  }

  listApplications(accountId: number) {
    return this.prisma.babyMember.findMany({
      where: { accountId, status: { not: 'APPROVED' } },
      select: { babyId: true, name: true, role: true, status: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async listMembers(accountId: number, babyId: string) {
    const member = await this.prisma.babyMember.findUnique({
      where: { accountId_babyId: { accountId, babyId } },
    });
    if (!canAccessBaby(member, false)) throw new BusinessException(ErrorCode.BABY_NOT_FOUND);

    return this.prisma.babyMember.findMany({
      where: { babyId, status: member?.isAdmin ? { in: ['PENDING', 'APPROVED'] } : 'APPROVED' },
      select: publicMember,
      orderBy: [{ isAdmin: 'desc' }, { updatedAt: 'asc' }],
    });
  }

  async changeStatus(accountId: number, babyId: string, targetId: number, status: MembershipStatus) {
    return this.prisma.$transaction(async (db) => {
      const admin = await db.babyMember.findUnique({ where: { accountId_babyId: { accountId, babyId } } });
      if (!canAccessBaby(admin, true)) throw new BusinessException(ErrorCode.BABY_NOT_FOUND);
      const previous = status === 'REMOVED' ? 'APPROVED' : 'PENDING';
      const where = { accountId: targetId, babyId, status: previous, isAdmin: false } as const;
      const target = await db.babyMember.findFirst({ where });
      if (!target) this.unavailable();
      const creator = status === 'APPROVED'
        ? await db.user.create({ data: { name: target.name, role: target.role } })
        : undefined;
      const result = await db.babyMember.updateMany({
        where, data: { status, ...(creator && { creatorId: creator.id }) },
      });
      if (!result.count) this.unavailable();
      return { status };
    });
  }

  async claim(accountId: number, dto: ClaimDto) {
    const babyId = parseBabyId(dto.babyId);
    return this.prisma.$transaction(async (db) => {
      // The operator command takes the same lock before issuing or replacing a claim.
      await db.$queryRaw`SELECT id FROM baby WHERE id = ${babyId} FOR UPDATE`;
      const consumed = await db.babyClaim.deleteMany({
        where: { babyId, codeHash: secretHash(dto.code.toLowerCase()), expiresAt: { gt: new Date() } },
      });
      if (!consumed.count || await db.babyMember.count({ where: { babyId, isAdmin: true } })) {
        throw new BusinessException(ErrorCode.PARAM_INVALID, '认领码无效或已过期');
      }
      await createMembership(db, accountId, babyId, dto);
      await initializeBabyConfigs(db, babyId);
      return { babyId };
    });
  }

  private unavailable(): never {
    throw new BusinessException(ErrorCode.RECORD_NOT_FOUND, '成员申请不存在或已处理');
  }
}
