import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { parseBabyId } from '../../common/utils/baby-id.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import { FamilyRequest, canAccessBaby, recordId } from './family-scope';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const controller = context.getClass();
    const handler = context.getHandler();
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [handler, controller])) return true;

    const request = context.switchToHttp().getRequest<FamilyRequest>();
    const session = await this.auth.getSession(request);
    if (!session) throw new BusinessException(ErrorCode.UNAUTHORIZED, '登录已过期，请重新登录');
    request.accountId = session.accountId;
    request.channel = session.channel;

    const route = this.reflector.get<string>(PATH_METADATA, controller);
    const path = this.reflector.get<string>(PATH_METADATA, handler);
    const { method, body, params, query } = request;
    if (route === 'auth' || route === 'family') return true;

    const recordLookup: Record<string, (id: number) => Promise<{ babyId: string } | null>> = {
      feedings: (id) => this.prisma.feeding.findUnique({ where: { id }, select: { babyId: true } }),
      diapers: (id) => this.prisma.diaper.findUnique({ where: { id }, select: { babyId: true } }),
      sleeps: (id) => this.prisma.sleep.findUnique({ where: { id }, select: { babyId: true } }),
      activities: (id) => this.prisma.activity.findUnique({ where: { id }, select: { babyId: true } }),
      temperatures: (id) => this.prisma.temperature.findUnique({ where: { id }, select: { babyId: true } }),
      growths: (id) => this.prisma.growthRecord.findUnique({ where: { id }, select: { babyId: true } }),
      supplements: (id) => this.prisma.supplement.findUnique({ where: { id }, select: { babyId: true } }),
      'food-allergies': (id) => this.prisma.foodAllergyRecord.findUnique({ where: { id }, select: { babyId: true } }),
    };
    const configuration = ['foods', 'supplement-configs', 'exercise-configs'];
    const aggregates = ['dashboard', 'intervals', 'records', 'statistics', 'charts'];
    let babyId: string;
    let admin = false;
    let assignCreator = false;

    if (route === 'babies') {
      if (path === '/' && (method === 'POST' || method === 'GET')) return true;
      babyId = parseBabyId(params.id);
      admin = method !== 'GET';
    } else if (configuration.includes(route)) {
      babyId = parseBabyId(request.get('x-baby-id'));
    } else if (Object.prototype.hasOwnProperty.call(recordLookup, route)) {
      if (path.startsWith(':id')) {
        const record = await recordLookup[route](recordId(params.id));
        if (!record) throw new BusinessException(ErrorCode.RECORD_NOT_FOUND);
        babyId = record.babyId;
      } else if (method === 'POST') {
        babyId = parseBabyId(body?.babyId);
        assignCreator = true;
      } else {
        babyId = parseBabyId(query.babyId);
      }
    } else if (aggregates.includes(route)) {
      babyId = parseBabyId(query.babyId);
    } else {
      throw new BusinessException(ErrorCode.RECORD_NOT_FOUND);
    }

    const member = await this.prisma.babyMember.findUnique({
      where: { accountId_babyId: { accountId: request.accountId, babyId } },
      select: { status: true, isAdmin: true, creatorId: true },
    });
    if (!canAccessBaby(member, admin) || (assignCreator && !member?.creatorId)) {
      throw new BusinessException(route === 'babies' || !params.id ? ErrorCode.BABY_NOT_FOUND : ErrorCode.RECORD_NOT_FOUND);
    }

    if (params.id && Object.prototype.hasOwnProperty.call(recordLookup, route)
      && body && (body.babyId !== undefined || body.creatorId !== undefined)) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '不能修改记录归属或记录人');
    }
    request.babyId = babyId;
    if (assignCreator) body.creatorId = member!.creatorId;
    if (query?.babyId !== undefined) query.babyId = babyId;
    if (body?.babyId !== undefined) body.babyId = babyId;
    return true;
  }
}
