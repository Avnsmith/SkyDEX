import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // ── Runtime env validation ──────────────────────────────────────────────
  const required = ['DATABASE_URL', 'REDIS_HOST'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    logger.warn(`Missing recommended env vars: ${missing.join(', ')} — some features may degrade`);
  }

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  // ── CORS: allow frontend origin + WebSocket upgrade ─────────────────────
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map((o) => o.trim());
  app.enableCors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Payment', 'Payment-Signature'],
    credentials: true,
  });

  // ── API prefix ──────────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`StreamPay API running on port ${port}`);
}

bootstrap();
