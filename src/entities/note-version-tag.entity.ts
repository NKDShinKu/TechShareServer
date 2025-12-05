import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NoteVersion } from './note-version.entity';
import { Tag } from './tag.entity';

@Entity('note_version_tags')
export class NoteVersionTag {
  @PrimaryColumn({ type: 'bigint', unsigned: true })
  version_id: string;

  @PrimaryColumn({ type: 'bigint', unsigned: true })
  tag_id: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  // 关联
  @ManyToOne(() => NoteVersion, (version) => version.noteVersionTags)
  @JoinColumn({ name: 'version_id' })
  version: NoteVersion;

  @ManyToOne(() => Tag, (tag) => tag.noteVersionTags)
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}

