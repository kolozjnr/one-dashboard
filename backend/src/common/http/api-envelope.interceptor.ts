import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

interface RequestWithId extends Request {
  requestId: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: { requestId: string };
}

@Injectable()
export class ApiEnvelopeInterceptor<T>
  implements NestInterceptor<T, ApiSuccess<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccess<T>> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    return next.handle().pipe(
      map((data: T) => ({
        success: true as const,
        data,
        meta: { requestId: request.requestId },
      })),
    );
  }
}
