import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Note } from './note.entity';

@Entity('note_attachments')
export class NoteAttachment {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  note_id: string;

  @Column({ type: 'varchar', length: 255 })
  url: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  filename: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  mime_type: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  size_bytes: number;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  // 关联
  @ManyToOne(() => Note, (note) => note.attachments)
  @JoinColumn({ name: 'note_id' })
  note: Note;
}

