import { Controller, Get, Post, Delete, Param, UseGuards, UseInterceptors, UploadedFile, Res, ParseUUIDPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('api/files')
@UseGuards(AuthGuard)
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post('upload')
  @Throttle({ strict: { ttl: 60_000, limit: 10 } })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.filesService.uploadFile(user.id, file);
  }

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.filesService.findAll(user.id);
  }

  @Get(':id/download')
  async download(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: any,
  ) {
    const fileData = await this.filesService.downloadFile(user.id, id);

    res.set({
      'Content-Type': fileData.mimeType,
      'Content-Disposition': `attachment; filename="${fileData.filename}"`,
      'Content-Length': fileData.buffer.length,
    });

    res.end(fileData.buffer);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.filesService.remove(user.id, id);
  }
}
