import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { Request } from 'express';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { PrismaService } from '../../prisma/prisma.service';

export const secretHash = (value: string) => createHash('sha256').update(value).digest('hex');
const challengeLifetime = 120_000;

@Injectable()
export class AuthService {
  static readonly COOKIE_NAME = 'baby_record_account';
  static readonly BROWSER_COOKIE = 'baby_record_browser';
  readonly cookieSecure: boolean;
  readonly sessionSeconds: number;
  private cachedAccessToken?: { value: string; expiresAt: number };

  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {
    this.sessionSeconds = config.getOrThrow<number>('auth.sessionDays') * 24 * 60 * 60;
    this.cookieSecure = config.getOrThrow<boolean>('auth.cookieSecure');
  }

  async loginWechat(code: string) {
    const { appId, appSecret } = this.credentials();
    const result = await this.weixinJson('sns/jscode2session', {
      appid: appId, secret: appSecret, js_code: code, grant_type: 'authorization_code',
    });
    if (typeof result.openid !== 'string' || !result.openid) {
      if (result.errcode === 40029 || result.errcode === 40163) {
        throw new BusinessException(ErrorCode.UNAUTHORIZED, '微信登录凭证已失效，请重试');
      }
      this.unavailable();
    }
    const account = await this.prisma.account.upsert({
      where: { appId_openId: { appId, openId: result.openid } },
      create: { appId, openId: result.openid },
      update: {},
    }).catch(async (error) => {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      return this.prisma.account.findUniqueOrThrow({ where: { appId_openId: { appId, openId: result.openid as string } } });
    });
    await this.prisma.accountSession.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    return this.createSession(this.prisma, account.id, 'wechat');
  }

  private async createSession(db: Prisma.TransactionClient, accountId: number, channel: string) {
    const token = randomBytes(32).toString('base64url');
    await db.accountSession.create({
      data: { tokenHash: secretHash(token), accountId, channel, expiresAt: new Date(Date.now() + this.sessionSeconds * 1000) },
    });
    return { token, accountId, expiresIn: this.sessionSeconds };
  }

  async getSession(request: Request) {
    const bearer = request.get('authorization');
    const token = bearer === undefined ? this.readCookie(request, AuthService.COOKIE_NAME) : /^Bearer ([\w-]{43})$/.exec(bearer)?.[1];
    if (!token || !/^[\w-]{43}$/.test(token)) return null;
    return this.prisma.accountSession.findFirst({
      where: { tokenHash: secretHash(token), channel: bearer === undefined ? 'web' : 'wechat', expiresAt: { gt: new Date() } },
      select: { tokenHash: true, accountId: true, channel: true },
    });
  }

  async logout(request: Request) {
    const session = await this.getSession(request);
    if (session) await this.prisma.accountSession.deleteMany({ where: { tokenHash: session.tokenHash } });
  }

  readCookie(request: Request, name: string): string | undefined {
    return request.headers.cookie?.split(';').map((part) => part.trim())
      .find((part) => part.startsWith(name + '='))?.slice(name.length + 1);
  }

  cookieOptions(maxAge = this.sessionSeconds * 1000) {
    return { httpOnly: true, secure: this.cookieSecure, sameSite: 'strict' as const, path: '/', maxAge };
  }

  async startWebLogin() {
    const scene = randomBytes(16).toString('hex');
    const browserKey = randomBytes(32).toString('base64url');
    const qrCode = await this.makeWechatCode(scene);
    await this.prisma.webLogin.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    await this.prisma.webLogin.create({
      data: { scene, browserHash: secretHash(browserKey), expiresAt: new Date(Date.now() + challengeLifetime) },
    });
    return { scene, browserKey, qrCode, verificationCode: this.verificationCode(scene), expiresIn: challengeLifetime / 1000 };
  }

  async getWebLogin(scene: string) {
    const pending = await this.prisma.webLogin.findFirst({
      where: { scene, accountId: null, expiresAt: { gt: new Date() } }, select: { scene: true },
    });
    if (!pending) this.expired();
    return { verificationCode: this.verificationCode(scene) };
  }

  async confirmWebLogin(scene: string, accountId: number) {
    const result = await this.prisma.webLogin.updateMany({
      where: { scene, accountId: null, expiresAt: { gt: new Date() } },
      data: { accountId },
    });
    if (!result.count) this.expired();
  }

  async exchangeWebLogin(scene: string, browserKey: string | undefined, cancel = false) {
    if (!browserKey) return { status: 'EXPIRED' as const };
    const browserHash = secretHash(browserKey);
    return this.prisma.$transaction(async (db) => {
      const where = { scene, browserHash, expiresAt: { gt: new Date() } };
      const login = await db.webLogin.findFirst({ where });
      if (!login) return { status: 'EXPIRED' as const };
      if (cancel) {
        await db.webLogin.deleteMany({ where });
        return { status: 'CANCELLED' as const };
      }
      if (!login.accountId) return { status: 'PENDING' as const };
      const consumed = await db.webLogin.deleteMany({ where: { ...where, accountId: login.accountId } });
      if (!consumed.count) return { status: 'EXPIRED' as const };
      const session = await this.createSession(db, login.accountId, 'web');
      return { status: 'APPROVED' as const, ...session };
    });
  }

  private verificationCode(scene: string) {
    return String(parseInt(secretHash(scene).slice(0, 8), 16) % 1_000_000).padStart(6, '0');
  }

  private credentials() {
    const appId = this.config.get<string>('auth.wechatAppId');
    const appSecret = this.config.get<string>('auth.wechatAppSecret');
    if (!appId || !appSecret) this.unavailable();
    return { appId, appSecret };
  }

  private async weixinJson(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
    try {
      const response = await fetch('https://api.weixin.qq.com/' + path + '?' + new URLSearchParams(params), {
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) return await response.json() as Record<string, unknown>;
    } catch {
      this.unavailable();
    }
    return this.unavailable();
  }

  private async accessToken() {
    if (this.cachedAccessToken && this.cachedAccessToken.expiresAt > Date.now()) return this.cachedAccessToken.value;
    const { appId, appSecret } = this.credentials();
    const result = await this.weixinJson('cgi-bin/token', { appid: appId, secret: appSecret, grant_type: 'client_credential' });
    if (typeof result.access_token !== 'string' || typeof result.expires_in !== 'number') this.unavailable();
    this.cachedAccessToken = { value: result.access_token, expiresAt: Date.now() + (result.expires_in - 60) * 1000 };
    return result.access_token;
  }

  private async makeWechatCode(scene: string) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const accessToken = await this.accessToken();
      try {
        const response = await fetch('https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=' + encodeURIComponent(accessToken), {
          method: 'POST',
          body: JSON.stringify({
            scene, page: 'pages/web-login/index', check_path: false,
            env_version: this.config.get<string>('auth.wechatEnvVersion') || 'release',
          }),
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(8000),
        });
        const mime = response.headers.get('content-type')?.split(';')[0];
        if (response.ok && (mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/jpg')) {
          return 'data:' + mime + ';base64,' + Buffer.from(await response.arrayBuffer()).toString('base64');
        }
        const error = await response.json() as { errcode?: number };
        if (error.errcode !== 40001 && error.errcode !== 42001) break;
        this.cachedAccessToken = undefined;
      } catch {
        break;
      }
    }
    return this.unavailable();
  }

  private expired(): never {
    throw new BusinessException(ErrorCode.PARAM_INVALID, '二维码已过期或已处理，请在网页刷新后重试');
  }

  private unavailable(): never {
    throw new BusinessException(ErrorCode.SERVICE_UNAVAILABLE, '微信登录暂不可用，请稍后重试');
  }
}
