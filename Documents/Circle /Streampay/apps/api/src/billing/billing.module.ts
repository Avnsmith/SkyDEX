import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { GatewayModule } from '../gateway/gateway.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [GatewayModule, WebsocketModule, SessionsModule],
  providers: [BillingService],
})
export class BillingModule {}
