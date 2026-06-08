// x402 Nanopayment Batching Utilities

export class BatchingEngine {
  private pendingAmounts: Map<string, number> = new Map();
  private batchThreshold: number; // e.g., 1.0 USDC

  constructor(batchThreshold: number = 1.0) {
    this.batchThreshold = batchThreshold;
  }

  addUsage(sessionId: string, amount: number) {
    const current = this.pendingAmounts.get(sessionId) || 0;
    this.pendingAmounts.set(sessionId, current + amount);
  }

  shouldSettle(sessionId: string): boolean {
    const amount = this.pendingAmounts.get(sessionId) || 0;
    return amount >= this.batchThreshold;
  }

  getPendingAmount(sessionId: string): number {
    return this.pendingAmounts.get(sessionId) || 0;
  }

  clear(sessionId: string) {
    this.pendingAmounts.delete(sessionId);
  }
}
