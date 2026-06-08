import { Controller, Post, Body, Get, Query } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { IsString, IsEthereumAddress } from 'class-validator'
import { AuthService } from './auth.service'

class GetNonceDto {
  @IsEthereumAddress()
  address: string
}

class VerifySiweDto {
  @IsString()
  message: string

  @IsString()
  signature: string

  @IsEthereumAddress()
  address: string
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('nonce')
  @ApiOperation({ summary: 'Get a SIWE nonce for wallet authentication' })
  async getNonce(@Query() query: GetNonceDto) {
    const nonce = await this.authService.generateNonce(query.address)
    return { nonce }
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify SIWE signature and get JWT' })
  async verify(@Body() body: VerifySiweDto) {
    const token = await this.authService.verifySiwe(
      body.message,
      body.signature as `0x${string}`,
      body.address,
    )
    return { token, address: body.address.toLowerCase() }
  }
}
