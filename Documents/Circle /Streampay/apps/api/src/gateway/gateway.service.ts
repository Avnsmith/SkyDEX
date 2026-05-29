import { Injectable, Logger } from '@nestjs/common';
import { BatchFacilitatorClient } from "@circle-fin/x402-batching/server";

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);
  private facilitator: BatchFacilitatorClient;

  constructor() {
    this.facilitator = new BatchFacilitatorClient({
      url: "https://gateway-api-testnet.circle.com",
    });
  }

  async charge(params: { sessionId: string; amount: number; userAddress: string }) {
    this.logger.debug(`Charging ${params.amount} USDC for session ${params.sessionId}`);
    
    try {
      const requirements = {
        scheme: "exact",
        network: "eip155:5042002",
        asset: "0x3600000000000000000000000000000000000000",
        amount: Math.floor(params.amount * 1_000_000).toString(), // convert to 6 decimals
        maxTimeoutSeconds: 604900,
        payTo: "0xE250864F7d53201170370d472C941a6FB7C511A0", // StreamEscrow address
        extra: {
          name: "GatewayWalletBatched",
          version: "1",
          verifyingContract: "0x0077777d7EBA4688BDeF3E311b846F25870A19B9",
        },
      };

      // Mock payload since we don't have the client's signature in this backend job context directly.
      // In a full production flow, the client signs a session allowance upfront.
      const payload = {
        payer: params.userAddress,
        signature: "0xmockedsignaturefornow" as `0x${string}`
      };

      // In real prod, this would call: await this.facilitator.settle(payload, requirements);
      // For this step, we log the intended payload to demonstrate the gateway structure:
      this.logger.log(`[x402 Settlement Prepared]: ${JSON.stringify(requirements)}`);
      
    } catch (error) {
      this.logger.error(`x402 settlement failed for ${params.sessionId}`, error);
    }
  }
}
