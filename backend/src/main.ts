import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationError } from 'class-validator';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { ApiEnvelopeInterceptor } from './common/http/api-envelope.interceptor';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { CsrfGuard } from './modules/auth/csrf.guard';

function validationDetails(errors: ValidationError[]): { field: string; message: string }[] {
  return errors.flatMap((error) => {
    const ownErrors = Object.values(error.constraints ?? {}).map((message) => ({
      field: error.property,
      message,
    }));
    return [...ownErrors, ...validationDetails(error.children ?? [])];
  });
}

async function bootstrap(): Promise<void> {
  // rawBody keeps the exact bytes of webhook deliveries so providers' signatures
  // (HMAC over the body) can be verified after JSON parsing has run.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  app.enableShutdownHooks();
  app.use(cookieParser());
  const origins = config.getOrThrow<string>('CORS_ORIGIN')
    .split(',')
    .map((origin) => origin.trim());

  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: origins, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'The request could not be processed',
          details: validationDetails(errors),
        }),
    }),
  );
  app.useGlobalInterceptors(new ApiEnvelopeInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter(config));
  app.useGlobalGuards(new CsrfGuard(config));

  const openApiConfig = new DocumentBuilder()
    .setTitle('Metrispot API')
    .setDescription('API contract for the Metrispot platform')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(config.getOrThrow<number>('PORT'));
}

void bootstrap();
