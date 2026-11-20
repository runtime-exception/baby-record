import { Injectable } from '@nestjs/common';
import { Prisma, MembershipStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { secretHash } from '../auth/auth.service';
import { canAccessBaby } from '../auth/family-scope';
import { ApplyDto, ClaimDto, FamilyIdentityDto } from './identity.dto';
import { initializeBabyConfigs } from './default-configs';

const publicMember = { accountId: true, name: true, role: true, status: true, isAdmin: true, updatedAt: true };

export async function createMembership(
  db: Prisma.TransactionClient, accountId: number, babyId: number, identity: FamilyIdentityDto,
) {
  const name = identity.memberName.trim();
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
    const { babyId, role, memberName } = dto;
    if (await this.prisma.babyMember.count({ where: { babyId, status: 'APPROVED', isAdmin: true } })) {
      await this.prisma.babyMember.createMany({
        data: { accountId, babyId, role, name: memberName.trim(), status: 'PENDING' },
        skipDuplicates: true,
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

  async listMembers(accountId: number, babyId: number) {
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

  async changeStatus(accountId: number, babyId: number, targetId: number, status: MembershipStatus) {
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
    return this.prisma.$transaction(async (db) => {
      // The operator command takes the same lock before issuing or replacing a claim.
      await db.$queryRaw`SELECT id FROM baby WHERE id = ${dto.babyId} FOR UPDATE`;
      const consumed = await db.babyClaim.deleteMany({
        where: { babyId: dto.babyId, codeHash: secretHash(dto.code.toLowerCase()), expiresAt: { gt: new Date() } },
      });
      if (!consumed.count || await db.babyMember.count({ where: { babyId: dto.babyId, isAdmin: true } })) {
        throw new BusinessException(ErrorCode.PARAM_INVALID, '认领码无效或已过期');
      }
      await createMembership(db, accountId, dto.babyId, dto);
      await initializeBabyConfigs(db, dto.babyId);
      return { babyId: dto.babyId };
    });
  }

  private unavailable(): never {
    throw new BusinessException(ErrorCode.RECORD_NOT_FOUND, '成员申请不存在或已处理');
  }
}
