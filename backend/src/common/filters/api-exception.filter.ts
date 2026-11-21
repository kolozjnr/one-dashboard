import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

interface RequestWithId extends Request {
  requestId: string;
}

interface ErrorDetail {
  field?: string;
  message: string;
}

interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details: ErrorDetail[];
  };
  meta: { requestId: string };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(private readonly config: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const production = this.config.get<string>('NODE_ENV') === 'production';
    const requestId = request.requestId ?? 'unavailable';

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const error = exception instanceof Error ? exception : new Error('Unknown error');
      this.logger.error(
        JSON.stringify({ requestId, method: request.method, path: request.path, message: error.message }),
        error.stack,
      );
    }

    const errorResponse: ErrorBody = {
      success: false,
      error: this.toApiError(exception, status, production),
      meta: { requestId },
    };
    response.status(status).json(errorResponse);
  }

  private toApiError(
    exception: unknown,
    status: number,
    production: boolean,
  ): ErrorBody['error'] {
    const fallback = {
      code: this.codeForStatus(status),
      message: 'The request could not be processed',
      details: [] as ErrorDetail[],
    };
    if (!(exception instanceof HttpException)) return fallback;

    const payload: unknown = exception.getResponse();
    if (typeof payload === 'string') {
      return { ...fallback, message: status >= 500 && production ? 'An internal error occurred' : payload };
    }
    if (typeof payload !== 'object' || payload === null) return fallback;

    const body = payload as Record<string, unknown>;
    const safeServerMessage = status >= 500 && production;
    const message =
      !safeServerMessage && typeof body.message === 'string'
        ? body.message
        : safeServerMessage
          ? 'An internal error occurred'
          : fallback.message;
    const details = Array.isArray(body.details)
      ? body.details.filter(this.isErrorDetail)
      : Array.isArray(body.message)
        ? body.message
            .filter((item): item is string => typeof item === 'string')
            .map((item) => ({ message: item }))
        : [];

    return {
      code: typeof body.code === 'string' ? body.code : fallback.code,
      message,
      details,
    };
  }

  private isErrorDetail(value: unknown): value is ErrorDetail {
    return (
      typeof value === 'object' &&
      value !== null &&
      'message' in value &&
      typeof value.message === 'string'
    );
  }

  private codeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'VALIDATION_ERROR';
      default:
        return status >= 500 ? 'INTERNAL_ERROR' : 'HTTP_ERROR';
    }
  }
}
