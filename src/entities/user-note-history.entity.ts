import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Note } from './note.entity';

@Entity('user_note_history')
@Index(['user_id', 'viewed_at'])
export class UserNoteHistory {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  user_id: string;

  @Column({ type: 'bigint', unsigned: true })
  note_id: string;

  @Column({ type: 'datetime' })
  viewed_at: Date;

  // 关联
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Note, (note) => note.histories)
  @JoinColumn({ name: 'note_id' })
  note: Note;
}

