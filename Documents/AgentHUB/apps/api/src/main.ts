import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const logger = new Logger('Bootstrap')

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  })

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Payment', 'X-Payment-Reference'],
  })

  // Global validation pipe — strips unknown fields, transforms types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  // Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('AgentHub API')
    .setDescription(
      'Production x402 API marketplace backend on Arc Network (Chain ID: 5042002). ' +
        'Sellers register AI/data APIs; buyers pay per-call with USDC via x402.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addTag('auth', 'SIWE wallet authentication')
    .addTag('apis', 'API marketplace listings')
    .addTag('proxy', 'x402-gated API invocation')
    .addTag('analytics', 'Usage and revenue analytics')
    .addTag('health', 'Service health checks')
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  })

  const port = parseInt(process.env.PORT ?? '4000', 10)
  await app.listen(port)
  logger.log(`🚀 AgentHub API running on http://localhost:${port}`)
  logger.log(`📚 Swagger docs: http://localhost:${port}/docs`)
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err)
  process.exit(1)
})
