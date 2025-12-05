import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Note } from './note.entity';
import { Comment } from './comment.entity';
import { NoteLike } from './note-like.entity';
import { NoteFavorite } from './note-favorite.entity';
import { UserSetting } from './user-setting.entity';
import { Notification } from './notification.entity';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  NORMAL = 0,
  BANNED = 1,
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 128, unique: true, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  @Exclude()
  password_hash: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  nickname: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar_url: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  bio: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'tinyint', unsigned: true, default: UserStatus.NORMAL })
  status: UserStatus;

  @Column({ type: 'varchar', length: 128, nullable: true })
  github: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string;

  @Column({ type: 'datetime', nullable: true })
  last_login_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;

  // 关联
  @OneToMany(() => Note, (note) => note.author)
  notes: Note[];

  @OneToMany(() => Comment, (comment) => comment.author)
  comments: Comment[];

  @OneToMany(() => NoteLike, (like) => like.user)
  likes: NoteLike[];

  @OneToMany(() => NoteFavorite, (favorite) => favorite.user)
  favorites: NoteFavorite[];

  @OneToOne(() => UserSetting, (setting) => setting.user)
  settings: UserSetting;

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}

