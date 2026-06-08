/**
 * Example AI agent using AgentHubClient.
 *
 * This demonstrates how an AI agent with a Circle Agent Wallet can:
 * 1. Discover APIs in the marketplace
 * 2. Pay per request automatically via x402 (GatewayClient)
 * 3. Process results
 *
 * Prerequisites:
 *   npm install -g @circle-fin/cli
 *   circle wallet login you@example.com
 *   circle wallet list --type agent --chain ARC
 */

import { AgentHubClient } from '../packages/sdk/src'

const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`
const AGENTHUB_API_URL = process.env.AGENTHUB_API_URL ?? 'http://localhost:4000'

if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY environment variable is required')
}

const client = new AgentHubClient({
  privateKey: PRIVATE_KEY,
  baseUrl: AGENTHUB_API_URL,
  chain: 'arcTestnet',
})

async function main() {
  console.log('🤖 AgentHub AI Agent starting...\n')

  // 1. Discover available APIs
  console.log('📋 Discovering APIs...')
  const apis = await client.listApis({
    category: 'AI & ML',
    sort: 'popular',
    pageSize: 5,
  })

  if (apis.data.length === 0) {
    console.log('No AI & ML APIs found in marketplace.')
    return
  }

  console.log(`Found ${apis.total} APIs. Top results:`)
  apis.data.forEach((api) => {
    console.log(`  - ${api.name}: $${api.pricePerCall} USDC/req (${api.totalRequests} calls)`)
  })

  // 2. Pick the most popular API
  const targetApi = apis.data[0]
  console.log(`\n🎯 Calling: ${targetApi.name}`)
  console.log(`   Price: $${targetApi.pricePerCall} USDC per request`)
  console.log(`   The x402 payment will be handled automatically by GatewayClient\n`)

  try {
    // 3. Call the API — payment is handled automatically
    const result = await client.invoke(targetApi.id)

    console.log(`✅ Success! Status: ${result.status}`)
    console.log('📦 Response data:')
    console.log(JSON.stringify(result.data, null, 2))
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('❌ Failed to call API:', err.message)
    }
  }

  // 4. Check payment history
  console.log('\n📊 Checking payment history...')
  // Note: in production, derive address from private key
  // const address = privateKeyToAccount(PRIVATE_KEY).address
  // const history = await client.getPaymentHistory(address)
  // console.log(`Total calls made: ${history.length}`)
}

main().catch(console.error)
