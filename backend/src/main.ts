import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './modules/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
  const port = Number(process.env.PORT ?? 4000);

  app.use(helmet());
  app.enableCors({
    origin: corsOrigin,
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

  await app.listen(port);
}

void bootstrap();
