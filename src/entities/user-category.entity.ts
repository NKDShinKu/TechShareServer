import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { NoteUserCategory } from './note-user-category.entity';

@Entity('user_categories')
export class UserCategory {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  user_id: string;

  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  slug: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  parent_id: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;

  // 关联
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => UserCategory, (category) => category.children)
  @JoinColumn({ name: 'parent_id' })
  parent: UserCategory;

  @OneToMany(() => UserCategory, (category) => category.parent)
  children: UserCategory[];

  @OneToMany(
    () => NoteUserCategory,
    (noteUserCategory) => noteUserCategory.userCategory,
  )
  noteUserCategories: NoteUserCategory[];
}

