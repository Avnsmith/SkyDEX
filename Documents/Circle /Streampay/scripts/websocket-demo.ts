import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

async function runDemo() {
  console.log('[Demo Simulator] Starting connection to Websocket Gateway...');

  socket.on('connect', async () => {
    console.log('[Demo Simulator] Connected!');
    
    const sessionId = 'mock-session-id';
    socket.emit('session:join', { sessionId });

    console.log('[Demo Simulator] Simulating AI stream...');

    const fakeLogs = "[AI Agent] Booting workspace...\n[AI Agent] Establishing secure connection to Arc Testnet Gateway...\n[AI Agent] Validating x402 nanopayment channels...\n[AI Agent] Fetching real-time liquidity from Factory Pair (USDC/EURC)...\n[AI Agent] Scraping DOM for market depth...\n".split(' ');
    
    let runtime = 0;
    let spent = 0;
    const balance = 10;

    const interval = setInterval(() => {
      runtime += 1;
      spent += 0.0001;
      socket.emit('internal:balance_update', {
        sessionId,
        runtime,
        totalSpent: spent,
        balanceRemaining: Math.max(balance - spent, 0)
      });
    }, 1000);

    for (const log of fakeLogs) {
      socket.emit('internal:agent_log', { sessionId, token: log + ' ' });
      await new Promise(r => setTimeout(r, 300));
    }

    // Simulate DEX swap
    await new Promise(r => setTimeout(r, 1000));
    socket.emit('internal:dex_swap', { sessionId, message: '[Arc DEX] Tx initiated: 0xabc123... swapping 1.0 USDC -> EURC' });
    await new Promise(r => setTimeout(r, 1500));
    socket.emit('internal:dex_swap', { sessionId, message: '[Arc DEX] Success! 0.95 EURC received.' });

    // Simulate Completion
    await new Promise(r => setTimeout(r, 3000));
    socket.emit('internal:agent_log', { sessionId, token: "\n[AI Agent] Task finalized and telemetry saved." });
    socket.emit('internal:task_completed', { sessionId });
    
    clearInterval(interval);
    console.log('[Demo Simulator] Finished simulation cycle.');
    setTimeout(() => process.exit(0), 1000);
  });

  socket.on('connect_error', (err: any) => {
    console.error('[Demo Simulator] Connection failed. Is NestJS running?', err.message);
    process.exit(1);
  });
}

runDemo();
