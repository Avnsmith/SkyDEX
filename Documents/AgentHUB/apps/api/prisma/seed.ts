import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database with real API services...')

  // Clean existing services
  await prisma.apiRequest.deleteMany({})
  await prisma.dailyApiStat.deleteMany({})
  await prisma.paymentSettlement.deleteMany({})
  await prisma.paymentAttempt.deleteMany({})
  await prisma.failedAuthorization.deleteMany({})
  await prisma.apiService.deleteMany({})

  const sellerAddress = '0xa9e139d39548a5c1b2d9a31e107ca9dc7103caf0'

  const services = [
    {
      name: 'HuggingFace Llama AI Text Generation',
      description: 'Generate high-quality text completions using meta-llama Llama-3 model. Supports temperature, max tokens, and custom system prompts.',
      endpoint: 'https://httpbin.org/anything/llama',
      pricePerCall: '50000', // $0.05 USDC
      category: 'AI & ML',
      tags: ['llama3', 'text-generation', 'llm', 'ai'],
      totalRequests: 1450,
      totalRevenue: '72500000',
      uptimePercent: 99.8,
      avgLatencyMs: 254.5,
    },
    {
      name: 'CoinGecko Crypto Price Feed',
      description: 'Fetch real-time cryptocurrency prices, market caps, and 24h volumes. Supports simple/price parameters for BTC, ETH, and USDC.',
      endpoint: 'https://api.coingecko.com/api/v3/simple/price',
      pricePerCall: '10000', // $0.01 USDC
      category: 'Finance & DeFi',
      tags: ['crypto', 'bitcoin', 'ethereum', 'prices', 'feed'],
      totalRequests: 8200,
      totalRevenue: '82000000',
      uptimePercent: 99.95,
      avgLatencyMs: 142.2,
    },
    {
      name: 'Open-Meteo Global Weather Analytics',
      description: 'Get precise local and global weather forecasts, temperature trends, historical indices, and weather codes without rate limit restrictions.',
      endpoint: 'https://api.open-meteo.com/v1/forecast',
      pricePerCall: '5000', // $0.005 USDC
      category: 'Data & Analytics',
      tags: ['weather', 'forecast', 'climate', 'gps'],
      totalRequests: 3200,
      totalRevenue: '16000000',
      uptimePercent: 100.0,
      avgLatencyMs: 98.4,
    },
    {
      name: 'Roberta Sentiment Analysis AI',
      description: 'Compute precise emotion, sentiment polarity, and confidence scores over uploaded english paragraphs using RoBERTa NLP models.',
      endpoint: 'https://httpbin.org/anything/sentiment',
      pricePerCall: '20000', // $0.02 USDC
      category: 'AI & ML',
      tags: ['sentiment', 'nlp', 'text-analysis', 'ai'],
      totalRequests: 940,
      totalRevenue: '18800000',
      uptimePercent: 99.7,
      avgLatencyMs: 185.0,
    },
    {
      name: 'Coinbase Blockchain Transaction Scanner',
      description: 'Expose live transaction pipelines, block indexes, gas averages, and token transfer records for BTC and EVM chains.',
      endpoint: 'https://httpbin.org/anything/blockchain',
      pricePerCall: '100000', // $0.10 USDC
      category: 'Finance & DeFi',
      tags: ['blockchain', 'scanner', 'ledger', 'coinbase'],
      totalRequests: 420,
      totalRevenue: '42000000',
      uptimePercent: 99.9,
      avgLatencyMs: 210.1,
    },
    {
      name: 'Pinecone Vector Search Middleware',
      description: 'Retrieve semantic matches, vector comparisons, and document relevance indexing using fast Cosine/L2 embedding distances.',
      endpoint: 'https://httpbin.org/anything/vector',
      pricePerCall: '30000', // $0.03 USDC
      category: 'Search',
      tags: ['vector', 'embeddings', 'semantic', 'search'],
      totalRequests: 2150,
      totalRevenue: '64500000',
      uptimePercent: 99.9,
      avgLatencyMs: 120.5,
    },
  ]

  for (const s of services) {
    const service = await prisma.apiService.create({
      data: {
        name: s.name,
        description: s.description,
        endpoint: s.endpoint,
        pricePerCall: s.pricePerCall,
        sellerAddress: sellerAddress.toLowerCase(),
        category: s.category,
        tags: s.tags,
        totalRequests: s.totalRequests,
        totalRevenue: s.totalRevenue,
        uptimePercent: s.uptimePercent,
        avgLatencyMs: s.avgLatencyMs,
      },
    })
    console.log(`Created service: ${service.name} (${service.id})`)
  }

  console.log('Database seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
