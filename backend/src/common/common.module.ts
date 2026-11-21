import { Module } from '@nestjs/common';
import { RequestLoggingMiddleware } from './middleware/request-logging.middleware';

@Module({
  providers: [RequestLoggingMiddleware],
  exports: [RequestLoggingMiddleware],
})
export class CommonModule {}
