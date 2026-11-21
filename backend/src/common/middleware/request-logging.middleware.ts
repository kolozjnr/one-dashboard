import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

interface RequestWithId extends Request {
  requestId: string;
}

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: RequestWithId, response: Response, next: NextFunction): void {
    const startedAt = Date.now();
    request.requestId = randomUUID();
    response.setHeader('x-request-id', request.requestId);

    response.once('finish', () => {
      this.logger.log(
        JSON.stringify({
          requestId: request.requestId,
          method: request.method,
          path: request.path,
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt,
        }),
      );
    });

    next();
  }
}
