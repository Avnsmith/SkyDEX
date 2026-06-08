import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ApisService } from './apis.service'
import { CreateApiDto, UpdateApiDto, ApiListQueryDto } from './dto'

@ApiTags('apis')
@Controller('apis')
export class ApisController {
  constructor(private readonly apisService: ApisService) {}

  @Get()
  @ApiOperation({ summary: 'List all marketplace APIs' })
  async list(@Query() query: ApiListQueryDto) {
    return this.apisService.list(query)
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List APIs registered by current seller' })
  async mine(@Request() req: { user: { address: string } }) {
    return this.apisService.findBySeller(req.user.address)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get API detail' })
  async findOne(@Param('id') id: string) {
    return this.apisService.findOne(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new API' })
  async create(
    @Body() dto: CreateApiDto,
    @Request() req: { user: { address: string } },
  ) {
    return this.apisService.create(dto, req.user.address)
  }

  @Post('import-openapi')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import API via OpenAPI spec' })
  async importOpenApi(
    @Body() body: { spec: string; pricePerCall: string; category: string },
    @Request() req: { user: { address: string } },
  ) {
    return this.apisService.importOpenApi(body.spec, body.pricePerCall, body.category, req.user.address)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an API (owner only)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateApiDto,
    @Request() req: { user: { address: string } },
  ) {
    return this.apisService.update(id, dto, req.user.address)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate an API (owner only)' })
  async remove(
    @Param('id') id: string,
    @Request() req: { user: { address: string } },
  ) {
    return this.apisService.remove(id, req.user.address)
  }
}
