import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Controller('api/notes')
@UseGuards(AuthGuard)
export class NotesController {
  constructor(private notesService: NotesService) {}

  @Post()
  @Throttle({ strict: { ttl: 60_000, limit: 10 } })
  async create(@CurrentUser() user: any, @Body() createNoteDto: CreateNoteDto) {
    return this.notesService.create(user.id, createNoteDto.title, createNoteDto.content);
  }

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.notesService.findAll(user.id);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.notesService.findOne(user.id, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    return this.notesService.update(user.id, id, updateNoteDto.title, updateNoteDto.content);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.notesService.remove(user.id, id);
  }
}
