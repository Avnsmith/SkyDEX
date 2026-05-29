import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { ConfigService } from '@nestjs/config'
import { createPublicClient, http } from 'viem'
import { arcTestnet } from '@agenthub/config'
import { splitFee } from '../../common/usdc.utils'

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)
  private readonly publicClient: any
  private readonly platformFeeBps = 300 // Hardened 3% Platform Fee (300 bps)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const rpcUrl = this.config.get<string>('RPC_URL') ?? 'https://rpc.testnet.arc.network'
    this.publicClient = createPublicClient({
      chain: arcTestnet as any,
      transport: http(rpcUrl),
    })
  }

  /**
   * Persists a payment attempt in the database.
   */
  async recordAttempt(
    payerAddress: string,
    sellerAddress: string,
    serviceId: string,
    amountUsdc: string, // 6 decimals
    txReference: string,
    nonce: string,
    validBefore: number,
  ) {
    const validBeforeDate = new Date(validBefore * 1000)

    return this.prisma.paymentAttempt.create({
      data: {
        payerAddress: payerAddress.toLowerCase(),
        sellerAddress: sellerAddress.toLowerCase(),
        serviceId,
        amountUsdc,
        status: 'PENDING',
        txReference,
        nonce,
        validBefore: validBeforeDate,
      },
    })
  }

  /**
   * Settles a verified payment attempt and processes fee splits (3% platform fee, 97% seller).
   */
  async verifyAndSettle(txReference: string, txHash: string): Promise<any> {
    const attempt = await this.prisma.paymentAttempt.findUnique({
      where: { txReference },
    })

    if (!attempt) {
      throw new BadRequestException('Payment attempt reference not found')
    }

    if (attempt.status === 'SETTLED') {
      return attempt
    }

    const amountUnits = BigInt(attempt.amountUsdc)
    const { platformFee, sellerAmount } = splitFee(amountUnits, this.platformFeeBps)

    // Settle inside transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Update attempt status
      const updatedAttempt = await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: 'SETTLED' },
      })

      // 2. Create Settlement Ledger entry
      await tx.paymentSettlement.create({
        data: {
          attemptId: attempt.id,
          txHash,
          platformFeeUsdc: platformFee.toString(),
          sellerAmountUsdc: sellerAmount.toString(),
          status: 'PENDING', // Mined check runs in background reconciliation cron
        },
      })

      this.logger.log(`Payment settled locally: ref=${txReference}, tx=${txHash}`)
      return updatedAttempt
    })
  }

  /**
   * Runs an audit and reconciliation cycle over all pending settlements.
   * Leverages viem public client to fetch transaction confirmations on Arc Testnet.
   */
  async runReconciliationCycle(): Promise<void> {
    this.logger.log('Starting payments reconciliation job...')

    const pendingSettlements = await this.prisma.paymentSettlement.findMany({
      where: { status: 'PENDING' },
      include: { attempt: true },
    })

    if (pendingSettlements.length === 0) {
      this.logger.log('No pending settlements requiring reconciliation.')
      return
    }

    for (const settlement of pendingSettlements) {
      try {
        this.logger.debug(`Verifying transaction hash on-chain: ${settlement.txHash}`)

        // Fetch transaction receipt from Arc Testnet
        const receipt = await this.publicClient.getTransactionReceipt({
          hash: settlement.txHash as `0x${string}`,
        })

        if (!receipt) {
          this.logger.warn(`Transaction receipt not found yet for hash: ${settlement.txHash}`)
          continue
        }

        if (receipt.status === 'success') {
          // Transaction confirmed on-chain successfully
          await this.prisma.$transaction([
            this.prisma.paymentSettlement.update({
              where: { id: settlement.id },
              data: {
                status: 'CONFIRMED',
                blockNumber: Number(receipt.blockNumber),
              },
            }),
            this.prisma.paymentAttempt.update({
              where: { id: settlement.attemptId },
              data: { status: 'SETTLED' },
            }),
          ])
          this.logger.log(`Settlement verified & reconciled: tx=${settlement.txHash} in block ${receipt.blockNumber}`)
        } else {
          // Transaction reverted on-chain
          await this.prisma.$transaction([
            this.prisma.paymentSettlement.update({
              where: { id: settlement.id },
              data: { status: 'FAILED' },
            }),
            this.prisma.paymentAttempt.update({
              where: { id: settlement.attemptId },
              data: {
                status: 'FAILED',
                error: 'On-chain transaction reverted',
              },
            }),
          ])
          this.logger.error(`Settlement failed: Transaction reverted on-chain: ${settlement.txHash}`)
        }
      } catch (err: any) {
        this.logger.error(`Error reconciling settlement id ${settlement.id}: ${err.message}`)
      }
    }
  }
}
