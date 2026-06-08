import { Controller, Get, Param, Query, UseGuards, ParseIntPipe, DefaultValuePipe, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AttestationsService } from './attestations.service';

@Controller('api/attestations')
@UseGuards(AuthGuard)
export class AttestationsController {
  constructor(private attestationsService: AttestationsService) {}

  @Get()
  async getAttestations(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.attestationsService.findAll(user.id, page, limit);
  }

  @Get(':id')
  async getAttestation(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.attestationsService.findById(user.id, id);
  }
}
