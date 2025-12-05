import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('评论与互动')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '发表评论' })
  create(
    @CurrentUser('id') userId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.commentsService.create(userId, createCommentDto);
  }

  @Public()
  @Get('note/:noteId')
  @ApiOperation({ summary: '获取笔记的评论列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findByNote(
    @Param('noteId') noteId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.commentsService.findByNote(noteId, page, limit);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除评论' })
  remove(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id') commentId: string,
  ) {
    return this.commentsService.remove(userId, commentId, userRole);
  }

  @Post(':id/like')
  @ApiBearerAuth()
  @ApiOperation({ summary: '点赞/取消点赞评论' })
  likeComment(
    @CurrentUser('id') userId: string,
    @Param('id') commentId: string,
  ) {
    return this.commentsService.likeComment(userId, commentId);
  }

  @Post('notes/:noteId/like')
  @ApiBearerAuth()
  @ApiOperation({ summary: '点赞/取消点赞笔记' })
  likeNote(@CurrentUser('id') userId: string, @Param('noteId') noteId: string) {
    return this.commentsService.likeNote(userId, noteId);
  }

  @Post('notes/:noteId/favorite')
  @ApiBearerAuth()
  @ApiOperation({ summary: '收藏/取消收藏笔记' })
  favoriteNote(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
  ) {
    return this.commentsService.favoriteNote(userId, noteId);
  }

  @Get('notes/:noteId/interaction')
  @ApiBearerAuth()
  @ApiOperation({ summary: '检查用户对笔记的互动状态' })
  checkInteraction(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
  ) {
    return this.commentsService.checkUserInteraction(userId, noteId);
  }
}

