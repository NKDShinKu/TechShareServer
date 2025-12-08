import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { PublishNoteDto } from './dto/publish-note.dto';
import { QueryNotesDto } from './dto/query-notes.dto';
import { AuditNoteDto } from './dto/audit-note.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../entities/user.entity';

import { CreateUserCategoryDto } from './dto/create-user-category.dto';

@ApiTags('笔记')
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '获取笔记列表' })
  findAll(@Query() queryDto: QueryNotesDto) {
    return this.notesService.findAll(queryDto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '获取笔记详情' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    return this.notesService.findOne(id, userId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建笔记（草稿）' })
  create(
    @CurrentUser('id') userId: string,
    @Body() createNoteDto: CreateNoteDto,
  ) {
    return this.notesService.create(userId, createNoteDto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新笔记（草稿）' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    return this.notesService.update(userId, id, updateNoteDto);
  }

  @Post('publish')
  @ApiBearerAuth()
  @ApiOperation({ summary: '发布笔记（提交审核）' })
  publish(
    @CurrentUser('id') userId: string,
    @Body() publishNoteDto: PublishNoteDto,
  ) {
    return this.notesService.publish(userId, publishNoteDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除笔记' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notesService.remove(userId, id);
  }

  @Get('user/my-notes')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取我的笔记' })
  @ApiQuery({ name: 'status', required: false })
  findUserNotes(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
  ) {
    return this.notesService.findUserNotes(userId, status);
  }

  @Get(':id/versions')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取笔记版本列表' })
  getVersions(@CurrentUser('id') userId: string, @Param('id') noteId: string) {
    return this.notesService.getVersions(userId, noteId);
  }

  @Post(':id/rollback/:versionId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '回滚到指定版本' })
  rollback(
    @CurrentUser('id') userId: string,
    @Param('id') noteId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.notesService.rollback(userId, noteId, versionId);
  }

  // 管理员接口
  @Get('admin/pending')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取待审核笔记列表（管理员）' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getPendingNotes(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notesService.getPendingNotes(page, limit);
  }

  @Post('admin/audit/:versionId')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '审核笔记（管理员）' })
  audit(
    @CurrentUser('id') auditorId: string,
    @Param('versionId') versionId: string,
    @Body() auditNoteDto: AuditNoteDto,
  ) {
    return this.notesService.audit(auditorId, versionId, auditNoteDto);
  }

  // 用户分类（文件夹）管理
  @Post('categories')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建用户分类文件夹' })
  createUserCategory(
    @CurrentUser('id') userId: string,
    @Body() createUserCategoryDto: CreateUserCategoryDto,
  ) {
    return this.notesService.createUserCategory(
      userId,
      createUserCategoryDto.name,
      createUserCategoryDto.parent_id,
    );
  }

  @Get('categories/my')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取我的分类文件夹' })
  getUserCategories(@CurrentUser('id') userId: string) {
    return this.notesService.getUserCategories(userId);
  }

  @Put('categories/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新用户分类文件夹' })
  updateUserCategory(
    @CurrentUser('id') userId: string,
    @Param('id') categoryId: string,
    @Body() body: { name: string },
  ) {
    return this.notesService.updateUserCategory(userId, categoryId, body.name);
  }

  @Delete('categories/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除用户分类文件夹' })
  removeUserCategory(
    @CurrentUser('id') userId: string,
    @Param('id') categoryId: string,
  ) {
    return this.notesService.removeUserCategory(userId, categoryId);
  }
}

