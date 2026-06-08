import { Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLogsService } from './audit-logs.service';

@Controller('api/audit-logs')
@UseGuards(AuthGuard)
export class AuditLogsController {
  constructor(private auditLogsService: AuditLogsService) {}

  @Get()
  async getLogs(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.auditLogsService.getLogsForUser(user.id, page, limit);
  }
}
