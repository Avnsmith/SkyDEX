import { ethers } from 'ethers';

export interface GatewayConfig {
  apiKey: string;
  rpcUrl: string;
  gatewayUrl: string;
  chainId: number; // 5042002 for Arc Testnet
}

export class GatewayClient {
  private config: GatewayConfig;
  private provider: ethers.JsonRpcProvider;

  constructor(config: GatewayConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl, config.chainId);
  }

  // Method to invoke x402 settle
  async settle(sessionId: string, amountToSettle: number, userAddress: string) {
    // In production, this would securely call the Circle Gateway API
    // which delegates the transaction to an Agent Wallet to call the Gateway contract.
    console.log(`[GatewayClient] Settling ${amountToSettle} USDC for session ${sessionId} against user ${userAddress}...`);
    
    // Simulate successful API call to Gateway
    return {
      success: true,
      txHash: ethers.hexlify(ethers.randomBytes(32)),
      settledAmount: amountToSettle,
      timestamp: Date.now()
    };
  }

  async verifySignature(message: string, signature: string, expectedAddress: string) {
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === expectedAddress.toLowerCase();
  }
}
