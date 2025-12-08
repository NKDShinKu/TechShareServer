import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { NoteVersion } from './note-version.entity';
import { Comment } from './comment.entity';
import { NoteLike } from './note-like.entity';
import { NoteFavorite } from './note-favorite.entity';
import { NoteAttachment } from './note-attachment.entity';
import { UserNoteHistory } from './user-note-history.entity';
import { NoteUserCategory } from './note-user-category.entity';

export enum NoteStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  PRIVATE = 'private',
}

@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  author_id: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  draft_version_id: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  published_version_id: string;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  allow_export: boolean;

  @Column({ type: 'enum', enum: NoteStatus, default: NoteStatus.DRAFT })
  status: NoteStatus;

  @Column({ type: 'int', unsigned: true, default: 0 })
  likes_count: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  favorites_count: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  comments_count: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  views: number;

  @Column({ type: 'datetime', nullable: true })
  published_at: Date;

  @DeleteDateColumn({ type: 'datetime', nullable: true })
  deleted_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;

  // 关联
  @ManyToOne(() => User, (user) => user.notes)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @ManyToOne(() => NoteVersion)
  @JoinColumn({ name: 'draft_version_id' })
  draftVersion: NoteVersion;

  @ManyToOne(() => NoteVersion)
  @JoinColumn({ name: 'published_version_id' })
  publishedVersion: NoteVersion;

  @OneToMany(() => NoteVersion, (version) => version.note)
  versions: NoteVersion[];

  @OneToMany(() => Comment, (comment) => comment.note)
  comments: Comment[];

  @OneToMany(() => NoteLike, (like) => like.note)
  likes: NoteLike[];

  @OneToMany(() => NoteFavorite, (favorite) => favorite.note)
  favorites: NoteFavorite[];

  @OneToMany(() => NoteAttachment, (attachment) => attachment.note)
  attachments: NoteAttachment[];

  @OneToMany(() => UserNoteHistory, (history) => history.note)
  histories: UserNoteHistory[];

  @OneToMany(() => NoteUserCategory, (nuc) => nuc.note)
  noteUserCategories: NoteUserCategory[];
}

