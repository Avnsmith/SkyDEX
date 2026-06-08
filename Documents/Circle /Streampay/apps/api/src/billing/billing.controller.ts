import { Controller, Post, Body, Req, Res, HttpStatus } from '@nestjs/common';
import { BillingService } from './billing.service';
import type { Request, Response } from 'express';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('tick')
  async handleTick(@Body() body: { sessionId: string }, @Req() req: Request, @Res() res: Response) {
    // The x402 gateway middleware will attach payment info to req.payment if successful
    const payment = (req as any).payment;
    
    // Fallback or explicit check in case middleware passes but it's not strictly verified
    if (!payment && process.env.NODE_ENV === 'production') {
       return res.status(HttpStatus.PAYMENT_REQUIRED).json({ error: 'x402 Payment Required' });
    }

    try {
      const result = await this.billingService.processTick(body.sessionId);
      return res.status(HttpStatus.OK).json({ status: 'ok', compute: 'delivered', ...result });
    } catch (e: any) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: e.message });
    }
  }
}
