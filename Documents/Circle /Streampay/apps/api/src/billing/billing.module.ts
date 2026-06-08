import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { BillingService } from './billing.service';
import { GatewayModule } from '../gateway/gateway.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SessionsModule } from '../sessions/sessions.module';
import { BillingController } from './billing.controller';
import { createGatewayMiddleware } from '@circle-fin/x402-batching/server';
import { Logger } from '@nestjs/common';

@Module({
  imports: [GatewayModule, WebsocketModule, SessionsModule],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {
  private readonly logger = new Logger(BillingModule.name);

  configure(consumer: MiddlewareConsumer) {
    // ── Security: Seller address MUST come from env, never hardcoded ──────
    const sellerAddress = process.env.GATEWAY_WALLET;
    if (!sellerAddress) {
      this.logger.error(
        'GATEWAY_WALLET env var is not set — x402 billing middleware will reject all requests',
      );
    }

    const facilitatorUrl =
      process.env.GATEWAY_FACILITATOR_URL || 'https://gateway-api-testnet.circle.com';

    const gatewayMiddleware = createGatewayMiddleware({
      sellerAddress: sellerAddress || '0x0000000000000000000000000000000000000000',
      facilitatorUrl,
    }).require('$0.0001');

    consumer
      .apply(gatewayMiddleware)
      .forRoutes({ path: 'billing/tick', method: RequestMethod.POST });

    this.logger.log(`x402 Gateway middleware configured — seller: ${sellerAddress ?? 'UNSET'}`);
  }
}
