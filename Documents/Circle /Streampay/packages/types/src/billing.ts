export interface SessionUsage {
  sessionId: string;
  seconds: number;
  tokens: number;
  cost: number;
  balanceRemaining: number;
}
