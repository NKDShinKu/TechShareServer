import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../../entities/user.entity';
import { UserSetting } from '../../entities/user-setting.entity';
import { NoteLike } from '../../entities/note-like.entity';
import { NoteFavorite } from '../../entities/note-favorite.entity';
import { UserNoteHistory } from '../../entities/user-note-history.entity';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserSetting,
      NoteLike,
      NoteFavorite,
      UserNoteHistory,
    ]),
    UploadModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

