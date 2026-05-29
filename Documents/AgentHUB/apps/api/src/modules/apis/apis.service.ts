import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { validateSellerEndpoint } from '../../common/ssrf-guard'
import { parseUsdc } from '../../common/usdc.utils'
import { CreateApiDto, UpdateApiDto, ApiListQueryDto } from './dto'

@Injectable()
export class ApisService {
  private readonly logger = new Logger(ApisService.name)

  constructor(private readonly prisma: PrismaService) {}

  async list(query: ApiListQueryDto) {
    const where: Record<string, any> = { isActive: true }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { tags: { has: query.search } },
      ]
    }

    if (query.category) {
      where.category = query.category
    }

    const orderBy = this.buildOrderBy(query.sort)
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const skip = (page - 1) * pageSize

    const [data, total] = await this.prisma.$transaction([
      this.prisma.apiService.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          name: true,
          description: true,
          pricePerCall: true,
          sellerAddress: true,
          category: true,
          tags: true,
          isActive: true,
          totalRequests: true,
          totalRevenue: true,
          uptimePercent: true,
          avgLatencyMs: true,
          createdAt: true,
          updatedAt: true,
          // Never return endpoint — it's private
        },
      }),
      this.prisma.apiService.count({ where }),
    ])

    return {
      data,
      total,
      page,
      pageSize,
      hasMore: skip + data.length < total,
    }
  }

  async findOne(id: string) {
    const service = await this.prisma.apiService.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        pricePerCall: true,
        sellerAddress: true,
        category: true,
        tags: true,
        isActive: true,
        totalRequests: true,
        totalRevenue: true,
        uptimePercent: true,
        avgLatencyMs: true,
        createdAt: true,
        updatedAt: true,
        requests: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            payerAddress: true,
            amountUsdc: true,
            responseStatus: true,
            latencyMs: true,
            createdAt: true,
          },
        },
      },
    })
    if (!service) throw new NotFoundException('API not found')
    return service
  }

  async findBySeller(sellerAddress: string) {
    return this.prisma.apiService.findMany({
      where: { sellerAddress: sellerAddress.toLowerCase() },
      orderBy: { createdAt: 'desc' },
    })
  }

  async create(dto: CreateApiDto, sellerAddress: string) {
    // SSRF guard
    validateSellerEndpoint(dto.endpoint)

    // Parse and validate price
    const priceUnits = parseUsdc(dto.pricePerCall)
    if (priceUnits < 1n) {
      throw new Error('Price must be at least 0.000001 USDC')
    }

    const service = await this.prisma.apiService.create({
      data: {
        name: dto.name,
        description: dto.description,
        endpoint: dto.endpoint,
        pricePerCall: priceUnits.toString(),
        sellerAddress: sellerAddress.toLowerCase(),
        category: dto.category,
        tags: dto.tags ?? [],
      },
    })
    this.logger.log(`API registered: ${service.id} by ${sellerAddress}`)
    return service
  }

  async update(id: string, dto: UpdateApiDto, callerAddress: string) {
    const service = await this.prisma.apiService.findUnique({ where: { id } })
    if (!service) throw new NotFoundException('API not found')
    if (service.sellerAddress !== callerAddress.toLowerCase())
      throw new ForbiddenException('Not authorized to update this API')

    if (dto.endpoint) validateSellerEndpoint(dto.endpoint)

    const data: Record<string, any> = {}
    if (dto.name) data.name = dto.name
    if (dto.description) data.description = dto.description
    if (dto.endpoint) data.endpoint = dto.endpoint
    if (dto.pricePerCall) data.pricePerCall = parseUsdc(dto.pricePerCall).toString()
    if (dto.category) data.category = dto.category
    if (dto.tags) data.tags = dto.tags
    if (dto.isActive !== undefined) data.isActive = dto.isActive

    return this.prisma.apiService.update({ where: { id }, data })
  }

  async remove(id: string, callerAddress: string) {
    const service = await this.prisma.apiService.findUnique({ where: { id } })
    if (!service) throw new NotFoundException('API not found')
    if (service.sellerAddress !== callerAddress.toLowerCase())
      throw new ForbiddenException('Not authorized')
    return this.prisma.apiService.update({ where: { id }, data: { isActive: false } })
  }

  async importOpenApi(
    openApiSpec: string,
    pricePerCall: string,
    category: string,
    sellerAddress: string,
  ) {
    let parsed: any
    try {
      parsed = JSON.parse(openApiSpec)
    } catch {
      throw new BadRequestException('Invalid OpenAPI JSON format')
    }

    const name = parsed.info?.title || 'Imported API Spec'
    const description = parsed.info?.description || 'Scaffolded via OpenAPI schema.'
    const endpoint = parsed.servers?.[0]?.url

    if (!endpoint) {
      throw new BadRequestException('OpenAPI spec must declare at least one upstream server URL')
    }

    // SSRF Guard check on extracted endpoint
    validateSellerEndpoint(endpoint)

    const priceUnits = parseUsdc(pricePerCall)
    if (priceUnits < 1n) {
      throw new BadRequestException('Price must be at least 0.000001 USDC')
    }

    const service = await this.prisma.apiService.create({
      data: {
        name,
        description,
        endpoint,
        pricePerCall: priceUnits.toString(),
        sellerAddress: sellerAddress.toLowerCase(),
        category,
        tags: ['openapi', 'v1.0.0'],
      },
    })

    this.logger.log(`API auto-discovered & imported: ${service.id} by ${sellerAddress}`)
    return service
  }


  private buildOrderBy(sort?: string) {
    switch (sort) {
      case 'price_asc': return { pricePerCall: 'asc' as const }
      case 'price_desc': return { pricePerCall: 'desc' as const }
      case 'popular': return { totalRequests: 'desc' as const }
      case 'newest':
      default: return { createdAt: 'desc' as const }
    }
  }
}
