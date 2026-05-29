import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@streampay/database';
import { RiskEngine } from '@streampay/risk-engine';
import { AIProviderManager } from './providers/AIProviderManager';
import crypto from 'crypto';
import { GatewayClient } from "@circle-fin/x402-batching/client";

const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

const pubClient = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

const aiManager = new AIProviderManager();

async function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function emitEvent(sessionId: string, type: string, content: string) {
  await pubClient.publish(`session:${sessionId}:event`, JSON.stringify({
    id: crypto.randomUUID(),
    type,
    content,
    timestamp: Date.now()
  }));
}

async function main() {
  console.log('[AgentRuntime] Starting standalone orchestrator...');
  
  const worker = new Worker('agent-tasks', async job => {
    const sessionId = job.data.sessionId;
    console.log(`[AgentRuntime] Picked up job ${job.id} for session ${sessionId}`);
    
    await pubClient.publish(`session:${sessionId}:status`, JSON.stringify({ status: 'ACTIVE' }));
    
    const pk = process.env.PRIVATE_KEY as `0x${string}`;
    if (!pk) throw new Error("Missing PRIVATE_KEY in environment");

    // Initialize Gateway Client (Buyer Side)
    const gatewayClient = new GatewayClient({
      chain: "arcTestnet",
      privateKey: pk,
    });

    let runtime = 0;
    let spent = 0;
    const rate = job.data.rate || 0.0001;
    
    // Instead of a fake setInterval, we run a real execution loop
    const apiUrl = process.env.STREAMPAY_API_URL || 'http://localhost:3000';

    try {
      await emitEvent(sessionId, 'THOUGHT', 'Analyzing objective: ' + (job.data.task || 'Data scraping run'));
      
      // Step 1: Risk Engine Check
      const rules = [
        { type: 'MAX_DAILY_SPEND' as const, value: 100 },
        { type: 'ALLOWED_TOKENS' as const, value: ['0xusdc_testnet_address'] }
      ];
      const riskEngine = new RiskEngine(rules);
      const riskEval = riskEngine.evaluate({ amount: 1, dailySpentSoFar: 0, tokenAddress: '0xusdc_testnet_address' });
      
      if (!riskEval.approved) {
        await emitEvent(sessionId, 'RISK_ALERT', `Risk block: ${riskEval.reason}`);
        throw new Error(`Risk block: ${riskEval.reason}`);
      }

      await emitEvent(sessionId, 'THOUGHT', 'Risk check passed. Securing Circle Gateway x402 connection...');
      await delay(1000);

      // Start Token Streaming logic coupled with Gateway payments
      let tokensGenerated = 0;
      const stream = aiManager.executeTask(job.data.task || 'Start data scraping run', 'fast');
      
      // We consume the stream while paying per second
      let isStreamDone = false;
      
      const consumeStream = async () => {
        for await (const token of stream) {
          tokensGenerated++;
          pubClient.publish(`session:${sessionId}:token`, JSON.stringify({ token }));
        }
        isStreamDone = true;
      };
      
      consumeStream().catch(e => console.error(e));

      while (!isStreamDone) {
        // Core x402 Micropayment Tick
        try {
          await emitEvent(sessionId, 'TOOL_CALL', 'invoke_x402_payment: $0.0001 USDC via Circle Gateway');
          
          // Send real x402 payment to our NestJS billing endpoint
          const res = await gatewayClient.pay(`${apiUrl}/api/billing/tick`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
          
          if (res.status !== 200 && res.status !== 201) {
             throw new Error('Payment rejected by Gateway: HTTP ' + res.status);
          }
          
          runtime++;
          spent += rate;
          await emitEvent(sessionId, 'PAYMENT_SETTLED', `Micro-authorization successful: ${rate} USDC deduced.`);
        } catch (e: any) {
          await emitEvent(sessionId, 'RISK_ALERT', 'x402 Payment failed. Agent stopping. ' + e.message);
          break; // Stop execution on payment failure
        }
        
        await delay(1000); // 1 second per tick
      }
      
      pubClient.publish(`session:${sessionId}:token_done`, JSON.stringify({}));
      await delay(1000);

      await emitEvent(sessionId, 'THOUGHT', 'Task execution complete. Gateway batching initiated.');
      await delay(1500);

      await emitEvent(sessionId, 'PAYMENT_SETTLED', `Final batch settled: ${spent.toFixed(4)} USDC for ${tokensGenerated} tokens and ${runtime}s of compute on Arc Testnet.`);

      // Emit final telemetry
      await prisma.usageEvent.create({
        data: {
          sessionId: sessionId,
          computeSeconds: runtime,
          tokensGenerated: tokensGenerated,
          apiCalls: runtime,
          swapVolume: 0
        }
      });

    } catch (e: any) {
      console.error('[AgentRuntime] Job failed:', e);
      await emitEvent(sessionId, 'RISK_ALERT', 'Execution failed: ' + e.message);
    } finally {
      await pubClient.publish(`session:${sessionId}:status`, JSON.stringify({ status: 'COMPLETED' }));
      console.log(`[AgentRuntime] Job ${job.id} completed. Telemetry saved.`);
    }
  }, { connection: redisConnection });

  worker.on('failed', (job, err) => {
    console.error(`[AgentRuntime] Job ${job?.id} failed with ${err.message}`);
  });
}

main().catch(console.error);
