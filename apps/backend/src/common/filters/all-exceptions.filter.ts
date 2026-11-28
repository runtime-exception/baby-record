import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { ErrorCode, ErrorMessage } from '../enums/error-code.enum';

/**
 * 全局异常过滤器：统一处理 HttpException / Prisma 异常 / 未知异常
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let code: number = ErrorCode.INTERNAL_ERROR;
    let message = ErrorMessage[ErrorCode.INTERNAL_ERROR];
    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let details: unknown = undefined;

    // 1. HTTP 异常（含 BusinessException 与 ValidationPipe）
    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const resp = exception.getResponse();
      if (typeof resp === 'object' && resp !== null) {
        const r = resp as Record<string, unknown>;
        if (r.code !== undefined) {
          // 业务异常自带错误码
          code = Number(r.code);
          message = (r.message as string) || message;
          // 鉴权失败必须保留真实 HTTP 401，其余历史业务错误维持 200 契约
          httpStatus = code === ErrorCode.UNAUTHORIZED ? HttpStatus.UNAUTHORIZED : HttpStatus.OK;
        } else if (r.message) {
          // class-validator 校验异常：{ message: string[], error }
          code = ErrorCode.PARAM_INVALID;
          message = Array.isArray(r.message) ? r.message.join('; ') : String(r.message);
          details = r.message;
          httpStatus = HttpStatus.OK;
        }
      } else if (typeof resp === 'string') {
        code = ErrorCode.PARAM_INVALID;
        message = resp;
        httpStatus = HttpStatus.OK;
      }
    }
    // 2. Prisma 已知错误
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') {
        code = ErrorCode.RECORD_NOT_FOUND;
        message = '记录不存在';
        httpStatus = HttpStatus.OK;
      } else if (exception.code === 'P2002') {
        code = ErrorCode.PARAM_INVALID;
        message = '数据已存在（唯一约束冲突）';
        httpStatus = HttpStatus.OK;
      } else {
        code = ErrorCode.INTERNAL_ERROR;
        message = ErrorMessage[ErrorCode.INTERNAL_ERROR];
      }
    }
    // 日志
    if (httpStatus >= 500) {
      this.logger.error(
        `[${request.method}] ${request.path} -> ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`[${request.method}] ${request.url} -> code=${code} ${message}`);
    }

    response.status(httpStatus).json({
      code,
      message,
      data: null,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
