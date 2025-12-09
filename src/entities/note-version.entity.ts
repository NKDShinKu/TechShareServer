import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Note } from './note.entity';
import { User } from './user.entity';
import { Category } from './category.entity';
import { NoteVersionTag } from './note-version-tag.entity';

// 版本类型
export enum VersionType {
  DRAFT = 'draft',         // 草稿版本
  PENDING = 'pending',     // 待审核版本
  PUBLISHED = 'published', // 已发布版本
}

@Entity('note_versions')
export class NoteVersion {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  note_id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'mediumtext' })
  content_md: string;

  @Column({ type: 'mediumtext', nullable: true })
  content_html: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  excerpt: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cover_url: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  category_id: string;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  allow_export: boolean;

  // 版本类型
  @Column({ type: 'enum', enum: VersionType, default: VersionType.DRAFT })
  version_type: VersionType;

  @Column({ type: 'bigint', unsigned: true })
  created_by: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  // 关联
  @ManyToOne(() => Note, (note) => note.versions)
  @JoinColumn({ name: 'note_id' })
  note: Note;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => Category, (category) => category.noteVersions)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => NoteVersionTag, (noteVersionTag) => noteVersionTag.version)
  noteVersionTags: NoteVersionTag[];
}
