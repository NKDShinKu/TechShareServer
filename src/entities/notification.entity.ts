import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Note } from './note.entity';
import { Comment } from './comment.entity';

export enum NotificationType {
  SYSTEM = 'system',
  COMMENT = 'comment',
  REPLY = 'reply',
  LIKE = 'like',
  FAVORITE = 'favorite',
  MENTION = 'mention',
}

@Entity('notifications')
@Index(['user_id', 'is_read'])
export class Notification {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  user_id: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  actor_user_id: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  note_id: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  comment_id: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  title: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  content: string;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  is_read: boolean;

  @Column({ type: 'datetime', nullable: true })
  read_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  // 关联
  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'actor_user_id' })
  actorUser: User;

  @ManyToOne(() => Note)
  @JoinColumn({ name: 'note_id' })
  note: Note;

  @ManyToOne(() => Comment)
  @JoinColumn({ name: 'comment_id' })
  comment: Comment;
}

