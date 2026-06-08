import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { SpaceComputerIntegrationModule } from './integrations/spacecomputer-integration.module';
import { EncryptionModule } from './modules/encryption/encryption.module';
import { NotesModule } from './modules/notes/notes.module';
import { FilesModule } from './modules/files/files.module';
import { AttestationsModule } from './modules/attestations/attestations.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AppController } from './app.controller';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // ── Rate limiting (in-memory, no Redis required) ─────────────────────
    // Global limits: 100 req/min per IP (general), tighter limits applied
    // per-route via @Throttle() decorator on sensitive endpoints.
    ThrottlerModule.forRoot([
      {
        name:  'global',
        ttl:   60_000,  // 1 minute window (ms)
        limit: 100,     // 100 requests per window per IP
      },
      {
        name:  'strict',
        ttl:   60_000,
        limit: 10,      // 10 requests per window — used on auth/upload routes
      },
    ]),

    PrismaModule,
    SpaceComputerIntegrationModule,
    EncryptionModule,
    NotesModule,
    FilesModule,
    AttestationsModule,
    AuditLogsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    // Apply ThrottlerGuard globally
    {
      provide:  APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
