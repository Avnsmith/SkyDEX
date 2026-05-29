import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@streampay/database';
import { RiskEngine } from '@streampay/risk-engine';
import { AIProviderManager } from './providers/AIProviderManager';

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

async function main() {
  console.log('[AgentRuntime] Starting standalone orchestrator...');

  const worker = new Worker('agent-tasks', async job => {
    const sessionId = job.data.sessionId;
    console.log(`[AgentRuntime] Picked up job ${job.id} for session ${sessionId}`);
    
    // Risk Check
    const rules = [
      { type: 'MAX_DAILY_SPEND' as const, value: 100 },
      { type: 'ALLOWED_TOKENS' as const, value: ['0xusdc_testnet_address'] }
    ];
    const riskEngine = new RiskEngine(rules);
    const riskEval = riskEngine.evaluate({ amount: 1, dailySpentSoFar: 0, tokenAddress: '0xusdc_testnet_address' });
    
    if (!riskEval.approved) {
      throw new Error(`Risk block: ${riskEval.reason}`);
    }

    // Real Arc DEX Swap via viem
    pubClient.publish(`session:${sessionId}:dex`, JSON.stringify({
      message: 'Preparing autonomous swap: 1.0 USDC -> EURC via Arc DEX...'
    }));
    
    try {
      const { createWalletClient, http, publicActions, parseAbi, parseUnits } = await import('viem');
      const { privateKeyToAccount } = await import('viem/accounts');
      const { arcTestnet } = await import('viem/chains');

      // Setup viem client
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
      
      // Approve router
      const approveHash = await client.writeContract({
        address: USDC,
        abi,
        functionName: 'approve',
        args: [ROUTER, amountIn]
      });
      await client.waitForTransactionReceipt({ hash: approveHash });

      // Swap
      const swapHash = await client.writeContract({
        address: ROUTER,
        abi,
        functionName: 'swapExactTokensForTokens',
        args: [
          amountIn,
          0n, // Accept any amount for demo
          [USDC, EURC],
          account.address,
          BigInt(Math.floor(Date.now() / 1000) + 1200)
        ]
      });
      await client.waitForTransactionReceipt({ hash: swapHash });

      pubClient.publish(\`session:\${sessionId}:dex\`, JSON.stringify({
        message: \`Swap completed. TxHash: \${swapHash}\`
      }));
    } catch (e) {
      console.error('[AgentRuntime] Swap failed:', e);
      pubClient.publish(\`session:\${sessionId}:dex\`, JSON.stringify({
        message: 'Swap failed. See logs.'
      }));
    }

    // Start Token Streaming
    let tokensGenerated = 0;
    const stream = aiManager.executeTask(job.data.instruction || 'Start data scraping run', 'fast');

    pubClient.publish(`session:${sessionId}:token`, JSON.stringify({ token: '\n\n' }));

    for await (const token of stream) {
      tokensGenerated++;
      // Publish token to Redis so NestJS can forward to websocket
      pubClient.publish(`session:${sessionId}:token`, JSON.stringify({ token }));
    }

    // Emit final telemetry
    await prisma.usageEvent.create({
      data: {
        sessionId: sessionId,
        computeSeconds: 5, // Mock compute duration
        tokensGenerated: tokensGenerated,
        apiCalls: 1,
        swapVolume: 1
      }
    });

    pubClient.publish(`session:${sessionId}:status`, JSON.stringify({ status: 'COMPLETED' }));

    console.log(`[AgentRuntime] Job ${job.id} completed. Telemetry saved.`);
  }, { connection: redisConnection });

  worker.on('failed', (job, err) => {
    console.error(`[AgentRuntime] Job ${job?.id} failed with ${err.message}`);
  });
}

main().catch(console.error);
