import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { Comment } from '../../entities/comment.entity';
import { CommentLike } from '../../entities/comment-like.entity';
import { CommentMention } from '../../entities/comment-mention.entity';
import { Note } from '../../entities/note.entity';
import { NoteLike } from '../../entities/note-like.entity';
import { NoteFavorite } from '../../entities/note-favorite.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Comment,
      CommentLike,
      CommentMention,
      Note,
      NoteLike,
      NoteFavorite,
    ]),
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}

