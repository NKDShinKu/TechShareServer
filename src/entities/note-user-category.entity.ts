import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Note } from './note.entity';
import { UserCategory } from './user-category.entity';

@Entity('note_user_categories')
export class NoteUserCategory {
  @PrimaryColumn({ type: 'bigint', unsigned: true })
  note_id: string;

  @PrimaryColumn({ type: 'bigint', unsigned: true })
  user_category_id: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  // 关联
  @ManyToOne(() => Note)
  @JoinColumn({ name: 'note_id' })
  note: Note;

  @ManyToOne(() => UserCategory, (category) => category.noteUserCategories)
  @JoinColumn({ name: 'user_category_id' })
  userCategory: UserCategory;
}

