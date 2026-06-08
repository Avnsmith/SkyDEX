import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Use NestJS built-in structured logger — no external services
    logger: ['log', 'warn', 'error'],
  });

  const config = app.get(ConfigService);
  const corsOrigin = config.get<string>('CORS_ORIGIN') || 'http://localhost:3000';
  const port      = config.get<number>('PORT') || 3001;

  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global exception filter — scrubs stack traces from API responses
  app.useGlobalFilters(new AllExceptionsFilter());

  const logger = new Logger('Bootstrap');
  logger.log(`OrbitNote API starting on port ${port}`);
  logger.log(`CORS origin: ${corsOrigin}`);
  logger.log(`SpaceComputer mode: ${config.get('SPACECOMPUTER_MODE') || 'mock'}`);

  await app.listen(port);
  logger.log(`API ready → http://0.0.0.0:${port}`);
}
bootstrap();
