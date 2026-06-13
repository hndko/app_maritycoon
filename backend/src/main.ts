import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { validateEnvironment } from './infrastructure/config/env.validation';
import { JsonLogger } from './infrastructure/logging/json-logger.service';
import { AppModule } from './modules/app.module';

type HttpRequest = {
  method: string;
  originalUrl: string;
  headers: Record<string, string | string[] | undefined>;
};

type HttpResponse = {
  statusCode: number;
  on(event: 'finish', callback: () => void): void;
};

type NextFunction = () => void;

type ExpressApplication = {
  set(name: string, value: boolean | number | string): void;
};

async function bootstrap() {
  const config = validateEnvironment();
  const logger = new JsonLogger();
  const app = await NestFactory.create(AppModule, { logger });

  if (config.trustProxy) {
    const instance = app.getHttpAdapter().getInstance() as ExpressApplication;
    instance.set('trust proxy', 1);
  }

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", config.corsOrigin],
        imgSrc: ["'self'", 'data:'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    hsts: config.nodeEnv === 'production'
      ? {
          maxAge: 31_536_000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
  }));
  app.enableCors({
    origin: config.corsOrigin,
    credentials: true
  });
  app.use((request: HttpRequest, response: HttpResponse, next: NextFunction) => {
    const startedAt = Date.now();

    response.on('finish', () => {
      logger.log({
        event: 'http_request',
        method: request.method,
        path: request.originalUrl,
        status: response.statusCode,
        duration_ms: Date.now() - startedAt,
        request_id: request.headers['x-request-id'],
      }, 'HttpRequest');
    });

    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.setGlobalPrefix('api');

  await app.listen(config.port);
}

void bootstrap();
