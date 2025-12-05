import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Note } from './note.entity';
import { User } from './user.entity';
import { CommentLike } from './comment-like.entity';
import { CommentMention } from './comment-mention.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  note_id: string;

  @Column({ type: 'bigint', unsigned: true })
  author_id: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  parent_id: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  root_id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', unsigned: true, default: 0 })
  likes_count: number;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  is_deleted: boolean;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;

  // 关联
  @ManyToOne(() => Note, (note) => note.comments)
  @JoinColumn({ name: 'note_id' })
  note: Note;

  @ManyToOne(() => User, (user) => user.comments)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @ManyToOne(() => Comment, (comment) => comment.replies)
  @JoinColumn({ name: 'parent_id' })
  parent: Comment;

  @OneToMany(() => Comment, (comment) => comment.parent)
  replies: Comment[];

  @ManyToOne(() => Comment)
  @JoinColumn({ name: 'root_id' })
  root: Comment;

  @OneToMany(() => CommentLike, (like) => like.comment)
  likes: CommentLike[];

  @OneToMany(() => CommentMention, (mention) => mention.comment)
  mentions: CommentMention[];
}

