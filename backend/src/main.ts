import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { validateEnvironment } from './infrastructure/config/env.validation';
import { AppModule } from './modules/app.module';

async function bootstrap() {
  const config = validateEnvironment();
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({
    origin: config.corsOrigin,
    credentials: true
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
