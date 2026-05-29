import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { BillingService } from './billing.service';
import { GatewayModule } from '../gateway/gateway.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SessionsModule } from '../sessions/sessions.module';
import { BillingController } from './billing.controller';
import { createGatewayMiddleware } from '@circle-fin/x402-batching/server';

@Module({
  imports: [GatewayModule, WebsocketModule, SessionsModule],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {
  configure(consumer: MiddlewareConsumer) {
    const gatewayMiddleware = createGatewayMiddleware({
      sellerAddress: process.env.GATEWAY_WALLET || '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
      facilitatorUrl: 'https://gateway-api-testnet.circle.com'
    }).require('$0.0001');

    consumer
      .apply(gatewayMiddleware)
      .forRoutes({ path: 'billing/tick', method: RequestMethod.POST });
  }
}
