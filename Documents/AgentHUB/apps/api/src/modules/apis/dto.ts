import {
  IsString,
  IsUrl,
  IsEnum,
  IsArray,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator'
import { Transform } from 'class-transformer'
import { API_CATEGORIES } from '@agenthub/config'

type ApiCategory = (typeof API_CATEGORIES)[number]

export class CreateApiDto {
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  name: string

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description: string

  @IsUrl({ protocols: ['https'], require_protocol: true })
  endpoint: string

  @IsString()
  // Must be a decimal string like "0.01" or "0.001"
  pricePerCall: string

  @IsEnum(API_CATEGORIES)
  category: ApiCategory

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  @IsOptional()
  tags: string[] = []
}

export class UpdateApiDto {
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @IsOptional()
  name?: string

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  @IsOptional()
  description?: string

  @IsUrl({ protocols: ['https'], require_protocol: true })
  @IsOptional()
  endpoint?: string

  @IsString()
  @IsOptional()
  pricePerCall?: string

  @IsEnum(API_CATEGORIES)
  @IsOptional()
  category?: ApiCategory

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  @IsOptional()
  tags?: string[]

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}

export class ApiListQueryDto {
  @IsString()
  @IsOptional()
  search?: string

  @IsEnum(API_CATEGORIES)
  @IsOptional()
  category?: ApiCategory

  @IsEnum(['price_asc', 'price_desc', 'popular', 'newest'])
  @IsOptional()
  sort?: 'price_asc' | 'price_desc' | 'popular' | 'newest'

  @Transform(({ value }) => parseInt(value) || 1)
  @IsOptional()
  page?: number = 1

  @Transform(({ value }) => Math.min(parseInt(value) || 20, 100))
  @IsOptional()
  pageSize?: number = 20
}
