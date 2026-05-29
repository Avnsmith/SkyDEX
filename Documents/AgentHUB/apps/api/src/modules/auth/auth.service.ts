import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../prisma/prisma.service'
import { verifyMessage } from 'viem'

interface SiwePayload {
  domain: string
  address: string
  statement: string
  uri: string
  version: string
  chainId: number
  nonce: string
  issuedAt: string
  expirationTime?: string
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Generate a fresh nonce for SIWE. Expires in 10 minutes. */
  async generateNonce(address: string): Promise<string> {
    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await this.prisma.siweNonce.create({
      data: { nonce, address: address.toLowerCase(), expiresAt },
    })

    return nonce
  }

  /** Verify SIWE signature and return JWT. */
  async verifySiwe(message: string, signature: `0x${string}`, address: string): Promise<string> {
    let payload: SiwePayload
    try {
      payload = this.parseSiweMessage(message)
    } catch {
      throw new BadRequestException('Invalid SIWE message format')
    }

    const normalizedAddress = address.toLowerCase()

    const nonceRecord = await this.prisma.siweNonce.findUnique({
      where: { nonce: payload.nonce },
    })

    if (!nonceRecord) throw new UnauthorizedException('Invalid or unknown nonce')
    if (nonceRecord.used) throw new UnauthorizedException('Nonce already used')
    if (nonceRecord.expiresAt < new Date()) throw new UnauthorizedException('Nonce expired')
    if (nonceRecord.address !== normalizedAddress) throw new UnauthorizedException('Address mismatch')

    let valid = false
    try {
      valid = await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature,
      })
    } catch (err) {
      this.logger.warn(`Signature verification error: ${err}`)
      throw new UnauthorizedException('Invalid signature')
    }

    if (!valid) throw new UnauthorizedException('Signature verification failed')

    await this.prisma.siweNonce.update({
      where: { nonce: payload.nonce },
      data: { used: true },
    })

    const token = this.jwt.sign({ address: normalizedAddress, sub: normalizedAddress })
    this.logger.log(`SIWE verified for ${normalizedAddress}`)
    return token
  }

  private parseSiweMessage(message: string): SiwePayload {
    const lines = message.split('\n')
    const extract = (prefix: string): string => {
      const line = lines.find((l) => l.startsWith(prefix))
      if (!line) throw new Error(`Missing field: ${prefix}`)
      return line.slice(prefix.length).trim()
    }

    // A SIWE message looks like:
    // domain wants you to sign in with your Ethereum account:
    // address
    //
    // statement
    //
    // URI: ...
    // Version: 1
    // Chain ID: ...
    // Nonce: ...
    // Issued At: ...
    return {
      domain: lines[0]?.split(' ')[0] ?? '',
      address: lines[1] ?? '',
      statement: '',
      uri: extract('URI: '),
      version: extract('Version: '),
      chainId: parseInt(extract('Chain ID: ')),
      nonce: extract('Nonce: '),
      issuedAt: extract('Issued At: '),
    }
  }
}
