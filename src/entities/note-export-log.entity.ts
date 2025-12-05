import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Note } from './note.entity';
import { User } from './user.entity';

export enum ExportFormat {
  MD = 'md',
  PDF = 'pdf',
}

@Entity('note_export_logs')
export class NoteExportLog {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  note_id: string;

  @Column({ type: 'bigint', unsigned: true })
  user_id: string;

  @Column({ type: 'enum', enum: ExportFormat })
  format: ExportFormat;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  // 关联
  @ManyToOne(() => Note)
  @JoinColumn({ name: 'note_id' })
  note: Note;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}

