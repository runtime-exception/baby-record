import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  const apiPrefix = configService.get<string>('app.apiPrefix') || 'api/v1';
  const swaggerPath = configService.get<string>('app.swaggerPath') || 'docs';
  const port = configService.get<number>('app.port') || 3000;

  // 放宽 JSON 请求体上限：宝宝头像以 Data URL 形式随 JSON 提交，base64 后体积较大
  app.useBodyParser('json', { limit: '8mb' });
  app.useBodyParser('urlencoded', { limit: '8mb', extended: true });

  // 全局 API 前缀
  app.setGlobalPrefix(apiPrefix);

  // 全局参数校验
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 全局异常过滤 + 统一响应拦截
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // 开发环境支持前后端跨域携带认证 Cookie；生产环境默认同源访问
  app.enableCors({
    origin: configService.get<string>('app.corsOrigin'),
    credentials: true,
  });

  // 宝宝资料、媒体和登录结果仅允许当前请求使用。
  app.use('/' + apiPrefix, (_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'private, no-store');
    next();
  });

  // Swagger 文档
  const swaggerConfig = new DocumentBuilder()
    .setTitle('宝宝成长记录服务 API')
    .setDescription('家庭内部使用的宝宝成长记录系统 —— RESTful API 文档\n\n统一响应格式：`{ code, message, data }`')
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(swaggerPath, app, document);

  await app.listen(port);

  Logger.log(`🚀 应用已启动: http://localhost:${port}/${apiPrefix}`, 'Bootstrap');
  Logger.log(`📄 Swagger 文档: http://localhost:${port}/${swaggerPath}`, 'Bootstrap');
}

bootstrap();
