import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { Tag } from '../../entities/tag.entity';
import { NoteVersionTag } from '../../entities/note-version-tag.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tag, NoteVersionTag])],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}

