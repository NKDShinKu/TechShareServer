import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { Note } from '../../entities/note.entity';
import { NoteVersion } from '../../entities/note-version.entity';
import { NoteVersionTag } from '../../entities/note-version-tag.entity';
import { UserCategory } from '../../entities/user-category.entity';
import { NoteUserCategory } from '../../entities/note-user-category.entity';
import { UserNoteHistory } from '../../entities/user-note-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Note,
      NoteVersion,
      NoteVersionTag,
      UserCategory,
      NoteUserCategory,
      UserNoteHistory,
    ]),
  ],
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}

