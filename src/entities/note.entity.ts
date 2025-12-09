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
  DRAFT = 'draft',         // 纯草稿（从未发布且未提交审核）
  PENDING = 'pending',     // 审核中
  REJECTED = 'rejected',   // 未通过
  PUBLISHED = 'published', // 已发布（无待审核内容）
  PRIVATE = 'private',     // 私密
}

@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  author_id: string;

  // 草稿版本ID（用户编辑的版本，不影响审核）
  @Column({ type: 'bigint', unsigned: true, nullable: true })
  draft_version_id: string | null;

  // 待审核版本ID（提交审核时从草稿复制）
  @Column({ type: 'bigint', unsigned: true, nullable: true })
  pending_version_id: string | null;

  // 已发布版本ID（审核通过后创建）
  @Column({ type: 'bigint', unsigned: true, nullable: true })
  published_version_id: string | null;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  allow_export: boolean;

  @Column({ type: 'enum', enum: NoteStatus, default: NoteStatus.DRAFT })
  status: NoteStatus;

  // 审核拒绝原因
  @Column({ type: 'varchar', length: 255, nullable: true })
  audit_reason: string | null;

  // 审核人ID
  @Column({ type: 'bigint', unsigned: true, nullable: true })
  auditor_id: string | null;

  @Column({ type: 'int', unsigned: true, default: 0 })
  likes_count: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  favorites_count: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  comments_count: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  views: number;

  @Column({ type: 'datetime', nullable: true })
  published_at: Date | null;

  @DeleteDateColumn({ type: 'datetime', nullable: true })
  deleted_at: Date | null;

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
  @JoinColumn({ name: 'pending_version_id' })
  pendingVersion: NoteVersion;

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

  @ManyToOne(() => User)
  @JoinColumn({ name: 'auditor_id' })
  auditor: User;
}
