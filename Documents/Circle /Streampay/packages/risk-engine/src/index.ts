export interface PolicyRule {
  type: 'MAX_DAILY_SPEND' | 'ALLOWED_TOKENS' | 'MAX_SWAP';
  value: any;
}

export interface RiskEvaluationPayload {
  tokenAddress?: string;
  amount?: number;
  dailySpentSoFar?: number;
}

export class RiskEngine {
  private rules: PolicyRule[];

  constructor(rules: PolicyRule[]) {
    this.rules = rules;
  }

  evaluate(payload: RiskEvaluationPayload): { approved: boolean; reason?: string } {
    for (const rule of this.rules) {
      if (rule.type === 'MAX_DAILY_SPEND') {
        const maxSpend = rule.value as number;
        const proposedTotal = (payload.dailySpentSoFar || 0) + (payload.amount || 0);
        if (proposedTotal > maxSpend) {
          return { approved: false, reason: `Exceeds max daily spend of ${maxSpend}` };
        }
      }

      if (rule.type === 'ALLOWED_TOKENS') {
        const allowedTokens = rule.value as string[];
        if (payload.tokenAddress && !allowedTokens.includes(payload.tokenAddress.toLowerCase())) {
          return { approved: false, reason: `Token ${payload.tokenAddress} is not whitelisted` };
        }
      }

      if (rule.type === 'MAX_SWAP') {
        const maxSwap = rule.value as number;
        if (payload.amount && payload.amount > maxSwap) {
          return { approved: false, reason: `Exceeds max single swap of ${maxSwap}` };
        }
      }
    }

    return { approved: true };
  }
}
