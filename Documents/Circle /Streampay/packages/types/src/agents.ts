export interface AgentTask {
  taskId: string;
  type: 'research' | 'coding' | 'scraping';
  payload: any;
  budget: number; // Max USDC amount allowed
}
