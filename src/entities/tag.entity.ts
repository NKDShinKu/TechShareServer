import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { NoteVersionTag } from './note-version-tag.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  slug: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  // 关联
  @OneToMany(() => NoteVersionTag, (noteVersionTag) => noteVersionTag.tag)
  noteVersionTags: NoteVersionTag[];
}

