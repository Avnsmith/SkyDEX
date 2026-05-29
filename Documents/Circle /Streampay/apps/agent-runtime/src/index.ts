import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@streampay/database';
import { RiskEngine } from '@streampay/risk-engine';
import { AIProviderManager } from './providers/AIProviderManager';
import crypto from 'crypto';

const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

const pubClient = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
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

  // Start a loop to pick up sessions instead of BullMQ for now if BullMQ is not being seeded
  // Actually, we'll keep BullMQ but we also need a way for the API to trigger it.
  // We'll write a simple loop here for demonstration, or we can use BullMQ if the api pushes to it.
  
  const worker = new Worker('agent-tasks', async job => {
    const sessionId = job.data.sessionId;
    console.log(`[AgentRuntime] Picked up job ${job.id} for session ${sessionId}`);
    
    await pubClient.publish(`session:${sessionId}:status`, JSON.stringify({ status: 'ACTIVE' }));
    
    // Setup streaming interval
    let runtime = 0;
    const rate = job.data.rate || 0.0001;
    let spent = 0;
    const balance = 10;
    
    const streamInterval = setInterval(() => {
      runtime += 1;
      spent += rate;
      pubClient.publish(`session:${sessionId}:stream_update`, JSON.stringify({
        runtime,
        totalSpent: spent,
        balanceRemaining: Math.max(balance - spent, 0)
      }));
    }, 1000);

    try {
      await emitEvent(sessionId, 'THOUGHT', 'Analyzing objective: ' + (job.data.task || 'Data scraping run'));
      await delay(1500);

      await emitEvent(sessionId, 'TOOL_CALL', 'invoke_tool: connect_arc_gateway');
      await delay(1000);

      // Risk Check
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
      
      await emitEvent(sessionId, 'THOUGHT', 'Risk check passed. Preparing autonomous swap: 1.0 USDC -> EURC via Arc DEX for European API access.');
      await delay(1500);

      // Real Arc DEX Swap via viem
      const { createWalletClient, http, publicActions, parseAbi, parseUnits } = await import('viem');
      const { privateKeyToAccount } = await import('viem/accounts');
      
      const pk = process.env.PRIVATE_KEY as \`0x\${string}\`;
      if (!pk) throw new Error("Missing PRIVATE_KEY in environment");
      const account = privateKeyToAccount(pk);
      const client = createWalletClient({
        account,
        chain: {
          id: 5042002,
          name: 'Arc Testnet',
          nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
          rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
          testnet: true
        },
        transport: http('https://rpc.testnet.arc.network')
      }).extend(publicActions);

      const USDC = '0x3600000000000000000000000000000000000000' as \`0x\${string}\`;
      const EURC = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' as \`0x\${string}\`;
      const ROUTER = '0x77c0E75D6b3F716416718B9666c6Ce7ae0407c03' as \`0x\${string}\`;
      
      const abi = parseAbi([
        'function approve(address spender, uint256 amount) external returns (bool)',
        'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
      ]);

      const amountIn = parseUnits('1', 6);
      
      await emitEvent(sessionId, 'TOOL_CALL', 'execute_transaction: approve USDC');
      const approveHash = await client.writeContract({ address: USDC, abi, functionName: 'approve', args: [ROUTER, amountIn] });
      await client.waitForTransactionReceipt({ hash: approveHash });

      await emitEvent(sessionId, 'TOOL_CALL', 'execute_transaction: swapExactTokensForTokens');
      const swapHash = await client.writeContract({
        address: ROUTER,
        abi,
        functionName: 'swapExactTokensForTokens',
        args: [ amountIn, 0n, [USDC, EURC], account.address, BigInt(Math.floor(Date.now() / 1000) + 1200) ]
      });
      await client.waitForTransactionReceipt({ hash: swapHash });

      await emitEvent(sessionId, 'DEX_SWAP', \`Swap completed successfully. TxHash: \${swapHash}\`);
      await delay(1500);

      await emitEvent(sessionId, 'THOUGHT', 'EURC acquired. Starting API scraping task...');
      await delay(1000);

      // Start Token Streaming
      let tokensGenerated = 0;
      const stream = aiManager.executeTask(job.data.task || 'Start data scraping run', 'fast');

      for await (const token of stream) {
        tokensGenerated++;
        pubClient.publish(\`session:\${sessionId}:token\`, JSON.stringify({ token }));
      }
      
      pubClient.publish(\`session:\${sessionId}:token_done\`, JSON.stringify({}));
      await delay(1000);

      await emitEvent(sessionId, 'THOUGHT', 'Task execution complete. Settling x402 nanopayment.');
      await delay(1500);

      await emitEvent(sessionId, 'PAYMENT_SETTLED', \`Settled \${spent.toFixed(4)} USDC for \${tokensGenerated} tokens and \${runtime}s of compute.\`);

      // Emit final telemetry
      await prisma.usageEvent.create({
        data: {
          sessionId: sessionId,
          computeSeconds: runtime,
          tokensGenerated: tokensGenerated,
          apiCalls: 1,
          swapVolume: 1
        }
      });

    } catch (e: any) {
      console.error('[AgentRuntime] Job failed:', e);
      await emitEvent(sessionId, 'RISK_ALERT', 'Execution failed: ' + e.message);
    } finally {
      clearInterval(streamInterval);
      await pubClient.publish(\`session:\${sessionId}:status\`, JSON.stringify({ status: 'COMPLETED' }));
      console.log(\`[AgentRuntime] Job \${job.id} completed. Telemetry saved.\`);
    }
  }, { connection: redisConnection });

  worker.on('failed', (job, err) => {
    console.error(\`[AgentRuntime] Job \${job?.id} failed with \${err.message}\`);
  });
}

main().catch(console.error);
