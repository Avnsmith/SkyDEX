import { createPublicClient, webSocket, parseAbiItem } from 'viem';
import { prisma } from '@streampay/database';
import { defineChain } from 'viem';

// Chain ID: 5042002
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'], webSocket: ['wss://rpc.testnet.arc.network/ws'] } },
  testnet: true,
});

async function main() {
  console.log('[Indexer] Starting Arc Testnet blockchain indexer...');

  const client = createPublicClient({
    chain: arcTestnet,
    transport: webSocket('wss://rpc.testnet.arc.network/ws'),
  });

  // Escrow Address (Mock/placeholder for real deployed contract)
  const ESCROW_ADDRESS = '0x1234567890123456789012345678901234567890';

  // SettleEvent from StreamEscrow
  // event Settled(uint256 sessionId, uint256 finalAmount);
  const settledEvent = parseAbiItem('event Settled(uint256 sessionId, uint256 finalAmount)');

  console.log(`[Indexer] Listening for Settled events on ${ESCROW_ADDRESS}...`);

  client.watchEvent({
    address: ESCROW_ADDRESS,
    event: settledEvent,
    onLogs: async (logs) => {
      for (const log of logs) {
        const sessionId = log.args.sessionId?.toString();
        const finalAmountStr = log.args.finalAmount?.toString();

        if (!sessionId || !finalAmountStr) continue;

        const finalAmount = parseFloat(finalAmountStr) / 1e6; // USDC has 6 decimals

        console.log(`[Indexer] Detected Settle event for session ${sessionId}: ${finalAmount} USDC`);

        try {
          // Update DB directly
          await prisma.session.update({
            where: { id: sessionId },
            data: { 
              status: 'SETTLED',
            }
          });
          console.log(`[Indexer] DB updated for session ${sessionId}`);
        } catch (error) {
          console.error(`[Indexer] DB Error for session ${sessionId}:`, error);
        }
      }
    },
    onError: (error) => {
      console.error('[Indexer] WebSocket error:', error);
    }
  });
}

main().catch(console.error);
