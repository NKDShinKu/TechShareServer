import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Note } from './note.entity';

@Entity('note_stats_daily')
@Index(['note_id', 'stat_date'], { unique: true })
export class NoteStatsDaily {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  note_id: string;

  @Column({ type: 'date' })
  stat_date: Date;

  @Column({ type: 'int', unsigned: true, default: 0 })
  views: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  likes: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  favorites: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  comments: number;

  // 关联
  @ManyToOne(() => Note)
  @JoinColumn({ name: 'note_id' })
  note: Note;
}

