import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

export enum EditorTheme {
  GREEN = 'green',
  BLUE = 'blue',
  PURPLE = 'purple',
  PINK = 'pink',
  ORANGE = 'orange',
  DEFAULT = 'default',
}

@Entity('user_settings')
export class UserSetting {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true, unique: true })
  user_id: string;

  @Column({ type: 'enum', enum: ThemeMode, default: ThemeMode.SYSTEM })
  theme: ThemeMode;

  @Column({ type: 'enum', enum: EditorTheme, default: EditorTheme.DEFAULT })
  editor_theme: EditorTheme;

  @Column({ type: 'json', nullable: true })
  editor_prefs: object;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;

  // 关联
  @OneToOne(() => User, (user) => user.settings)
  @JoinColumn({ name: 'user_id' })
  user: User;
}

