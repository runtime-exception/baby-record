import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { FamilyRequest } from './family-scope';

class WechatCodeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  code: string;
}

class SceneDto {
  @IsString()
  @Matches(/^[a-f0-9]{32}$/)
  scene: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('wechat')
  @HttpCode(200)
  login(@Body() dto: WechatCodeDto) {
    return this.auth.loginWechat(dto.code);
  }

  @Public()
  @Get('status')
  async status(@Req() request: Request) {
    const session = await this.auth.getSession(request);
    return { authenticated: !!session, accountId: session?.accountId };
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request);
    response.clearCookie(AuthService.COOKIE_NAME, this.auth.cookieOptions(0));
    return { authenticated: false };
  }

  @Public()
  @Post('web/start')
  async start(@Res({ passthrough: true }) response: Response) {
    const { browserKey, ...challenge } = await this.auth.startWebLogin();
    response.cookie(AuthService.BROWSER_COOKIE, browserKey, this.auth.cookieOptions(challenge.expiresIn * 1000));
    return challenge;
  }

  @Post('web/inspect')
  inspect(@Body() dto: SceneDto, @Req() request: FamilyRequest) {
    this.requireWechat(request);
    return this.auth.getWebLogin(dto.scene);
  }

  @Post('web/confirm')
  confirm(@Body() dto: SceneDto, @Req() request: FamilyRequest) {
    this.requireWechat(request);
    return this.auth.confirmWebLogin(dto.scene, request.accountId);
  }

  @Public()
  @Post('web/exchange')
  @HttpCode(200)
  async exchange(@Body() dto: SceneDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.exchangeWebLogin(dto.scene, this.auth.readCookie(request, AuthService.BROWSER_COOKIE));
    if (result.status === 'APPROVED') {
      response.cookie(AuthService.COOKIE_NAME, result.token, this.auth.cookieOptions());
      response.clearCookie(AuthService.BROWSER_COOKIE, this.auth.cookieOptions(0));
      return { status: result.status, accountId: result.accountId };
    }
    return { status: result.status };
  }

  @Public()
  @Post('web/cancel')
  @HttpCode(200)
  cancel(@Body() dto: SceneDto, @Req() request: Request) {
    return this.auth.exchangeWebLogin(dto.scene, this.auth.readCookie(request, AuthService.BROWSER_COOKIE), true);
  }
  private requireWechat(request: FamilyRequest) {
    if (request.channel !== 'wechat') {
      throw new BusinessException(ErrorCode.UNAUTHORIZED, '请在微信小程序中确认登录');
    }
  }

}
