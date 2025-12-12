import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Comment } from '../../entities/comment.entity';
import { CommentLike } from '../../entities/comment-like.entity';
import { CommentMention } from '../../entities/comment-mention.entity';
import { Note } from '../../entities/note.entity';
import { NoteLike } from '../../entities/note-like.entity';
import { NoteFavorite } from '../../entities/note-favorite.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notification.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(CommentLike)
    private commentLikesRepository: Repository<CommentLike>,
    @InjectRepository(CommentMention)
    private commentMentionsRepository: Repository<CommentMention>,
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
    @InjectRepository(NoteLike)
    private noteLikesRepository: Repository<NoteLike>,
    @InjectRepository(NoteFavorite)
    private noteFavoritesRepository: Repository<NoteFavorite>,
    private notificationsService: NotificationsService,
  ) {}

  // 创建评论
  async create(userId: string, createCommentDto: CreateCommentDto) {
    const { note_id, content, parent_id, root_id } = createCommentDto;

    // 检查笔记是否存在
    const note = await this.notesRepository.findOne({
      where: { id: note_id },
    });

    if (!note) {
      throw new NotFoundException('笔记不存在');
    }

    // 检查父评论是否存在（如果是回复）
    if (parent_id) {
      const parentComment = await this.commentsRepository.findOne({
        where: { id: parent_id },
      });

      if (!parentComment) {
        throw new NotFoundException('父评论不存在');
      }

      // 检查是否超过两级回复
      if (parentComment.parent_id && !root_id) {
        throw new BadRequestException('不支持超过两级的回复');
      }
    }

    // 创建评论
    const comment = this.commentsRepository.create({
      note_id,
      author_id: userId,
      content,
      parent_id,
      root_id: root_id || parent_id || undefined,
    });

    await this.commentsRepository.save(comment);

    // 更新笔记评论数
    note.comments_count += 1;
    await this.notesRepository.save(note);

    // 创建通知：评论或回复
    if (parent_id) {
      // 这是回复评论
      const parentComment = await this.commentsRepository.findOne({
        where: { id: parent_id },
        relations: ['author'],
      });
      
      // 1. 通知被回复的评论作者（如果不是自己回复自己）
      if (parentComment && parentComment.author_id !== userId) {
        await this.notificationsService.create(
          parentComment.author_id,
          NotificationType.REPLY,
          '收到新回复',
          `回复了你的评论：${content.substring(0, 50)}`,
          userId,
          note_id,
          comment.id,
        );
      }
      
      // 2. 如果笔记作者不是评论者本人，也不是被回复者，通知笔记作者
      if (userId !== note.author_id && note.author_id !== parentComment?.author_id) {
        await this.notificationsService.create(
          note.author_id,
          NotificationType.COMMENT,
          '笔记有新回复',
          `在你的笔记下回复了评论：${content.substring(0, 50)}`,
          userId,
          note_id,
          comment.id,
        );
      }
    } else {
      // 这是评论笔记，只通知笔记作者（如果不是自己评论自己的笔记）
      if (userId !== note.author_id) {
        await this.notificationsService.create(
          note.author_id,
          NotificationType.COMMENT,
          '收到新评论',
          `评论了你的笔记：${content.substring(0, 50)}`,
          userId,
          note_id,
          comment.id,
        );
      }
    }

    return comment;
  }

  // 获取笔记的评论列表
  async findByNote(noteId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    // 获取根评论（只返回 root_id 为 null 的评论）
    const [rootComments, totalRootComments] = await this.commentsRepository.findAndCount({
      where: { note_id: noteId, root_id: IsNull(), is_deleted: false },
      relations: ['author'],
      order: { created_at: 'ASC' },
      skip,
      take: limit,
    });

    // 统计该笔记的所有评论总数（包括根评论和回复）
    const totalAllComments = await this.commentsRepository.count({
      where: { note_id: noteId, is_deleted: false },
    });

    // 如果没有根评论，直接返回
    if (rootComments.length === 0) {
      return {
        data: [],
        total: totalRootComments,
        totalComments: totalAllComments,
        page,
        limit,
        totalPages: Math.ceil(totalRootComments / limit),
      };
    }

    // 获取这些根评论的所有回复（平铺结构）
    const rootCommentIds = rootComments.map((c) => c.id);
    const replies = await this.commentsRepository.find({
      where: {
        root_id: In(rootCommentIds),
        is_deleted: false,
      },
      relations: ['author'],
      order: { created_at: 'ASC' },
    });

    // 构建评论树：将回复添加到对应的根评论下
    const commentsWithReplies = rootComments.map((rootComment) => {
      const commentReplies = replies.filter(
        (reply) => reply.root_id === rootComment.id,
      );
      return {
        ...rootComment,
        replies: commentReplies,
      };
    });

    return {
      data: commentsWithReplies,
      total: totalRootComments, // 根评论数量（用于分页）
      totalComments: totalAllComments, // 所有评论数量（根评论+回复）
      page,
      limit,
      totalPages: Math.ceil(totalRootComments / limit),
    };
  }

  // 删除评论
  async remove(userId: string, commentId: string, userRole?: string) {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId },
      relations: ['note'],
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    // 只有评论作者、笔记作者或管理员可以删除
    const isAuthor = comment.author_id === userId;
    const isNoteAuthor = comment.note.author_id === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isAuthor && !isNoteAuthor && !isAdmin) {
      throw new ForbiddenException('无权限删除此评论');
    }

    // 软删除
    comment.is_deleted = true;
    await this.commentsRepository.save(comment);

    // 更新笔记评论数
    const note = comment.note;
    note.comments_count = Math.max(0, note.comments_count - 1);
    await this.notesRepository.save(note);

    return { message: '删除成功' };
  }

  // 点赞评论
  async likeComment(userId: string, commentId: string) {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    // 检查是否已点赞
    const existingLike = await this.commentLikesRepository.findOne({
      where: { user_id: userId, comment_id: commentId },
    });

    if (existingLike) {
      // 取消点赞
      await this.commentLikesRepository.remove(existingLike);
      comment.likes_count = Math.max(0, comment.likes_count - 1);
      await this.commentsRepository.save(comment);
      return { liked: false, count: comment.likes_count };
    } else {
      // 点赞
      const like = this.commentLikesRepository.create({
        user_id: userId,
        comment_id: commentId,
      });
      await this.commentLikesRepository.save(like);
      comment.likes_count += 1;
      await this.commentsRepository.save(comment);
      return { liked: true, count: comment.likes_count };
    }
  }

  // 点赞笔记
  async likeNote(userId: string, noteId: string) {
    const note = await this.notesRepository.findOne({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException('笔记不存在');
    }

    // 检查是否已点赞
    const existingLike = await this.noteLikesRepository.findOne({
      where: { user_id: userId, note_id: noteId },
    });

    if (existingLike) {
      // 取消点赞
      await this.noteLikesRepository.remove(existingLike);
      note.likes_count = Math.max(0, note.likes_count - 1);
      await this.notesRepository.save(note);
      return { liked: false, count: note.likes_count };
    } else {
      // 点赞
      const like = this.noteLikesRepository.create({
        user_id: userId,
        note_id: noteId,
      });
      await this.noteLikesRepository.save(like);
      note.likes_count += 1;
      await this.notesRepository.save(note);

      // 创建通知：点赞笔记（不给自己发通知）
      if (userId !== note.author_id) {
        const noteWithVersion = await this.notesRepository.findOne({
          where: { id: noteId },
          relations: ['publishedVersion'],
        });
        const noteTitle = noteWithVersion?.publishedVersion?.title || '你的笔记';
        await this.notificationsService.create(
          note.author_id,
          NotificationType.LIKE,
          '收到新点赞',
          `赞了你的笔记：${noteTitle}`,
          userId,
          noteId,
        );
      }

      return { liked: true, count: note.likes_count };
    }
  }

  // 收藏笔记
  async favoriteNote(userId: string, noteId: string) {
    const note = await this.notesRepository.findOne({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException('笔记不存在');
    }

    // 检查是否已收藏
    const existingFavorite = await this.noteFavoritesRepository.findOne({
      where: { user_id: userId, note_id: noteId },
    });

    if (existingFavorite) {
      // 取消收藏
      await this.noteFavoritesRepository.remove(existingFavorite);
      note.favorites_count = Math.max(0, note.favorites_count - 1);
      await this.notesRepository.save(note);
      return { favorited: false, count: note.favorites_count };
    } else {
      // 收藏
      const favorite = this.noteFavoritesRepository.create({
        user_id: userId,
        note_id: noteId,
      });
      await this.noteFavoritesRepository.save(favorite);
      note.favorites_count += 1;
      await this.notesRepository.save(note);

      // 创建通知：收藏笔记（不给自己发通知）
      if (userId !== note.author_id) {
        const noteWithVersion = await this.notesRepository.findOne({
          where: { id: noteId },
          relations: ['publishedVersion'],
        });
        const noteTitle = noteWithVersion?.publishedVersion?.title || '你的笔记';
        await this.notificationsService.create(
          note.author_id,
          NotificationType.FAVORITE,
          '收到新收藏',
          `收藏了你的笔记：${noteTitle}`,
          userId,
          noteId,
        );
      }

      return { favorited: true, count: note.favorites_count };
    }
  }

  // 检查用户是否点赞/收藏
  async checkUserInteraction(userId: string, noteId: string) {
    const [liked, favorited] = await Promise.all([
      this.noteLikesRepository.findOne({
        where: { user_id: userId, note_id: noteId },
      }),
      this.noteFavoritesRepository.findOne({
        where: { user_id: userId, note_id: noteId },
      }),
    ]);

    return {
      liked: !!liked,
      favorited: !!favorited,
    };
  }
}

