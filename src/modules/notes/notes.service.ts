import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Note, NoteStatus } from '../../entities/note.entity';
import { NoteVersion, AuditStatus } from '../../entities/note-version.entity';
import { NoteVersionTag } from '../../entities/note-version-tag.entity';
import { UserCategory } from '../../entities/user-category.entity';
import { NoteUserCategory } from '../../entities/note-user-category.entity';
import { UserNoteHistory } from '../../entities/user-note-history.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { PublishNoteDto } from './dto/publish-note.dto';
import { QueryNotesDto } from './dto/query-notes.dto';
import { AuditNoteDto } from './dto/audit-note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
    @InjectRepository(NoteVersion)
    private noteVersionRepository: Repository<NoteVersion>,
    @InjectRepository(NoteVersionTag)
    private noteVersionTagRepository: Repository<NoteVersionTag>,
    @InjectRepository(UserCategory)
    private userCategoryRepository: Repository<UserCategory>,
    @InjectRepository(NoteUserCategory)
    private noteUserCategoryRepository: Repository<NoteUserCategory>,
    @InjectRepository(UserNoteHistory)
    private userNoteHistoryRepository: Repository<UserNoteHistory>,
  ) {}

  // 创建笔记（草稿）
  async create(userId: string, createNoteDto: CreateNoteDto) {
    const { title, content_md, excerpt, allow_export, user_category_id } = createNoteDto;

    // 创建笔记主记录
    const note = this.notesRepository.create({
      author_id: userId,
      allow_export: allow_export || false,
      status: NoteStatus.DRAFT,
    });
    await this.notesRepository.save(note);

    // 创建草稿版本
    const draftVersion = this.noteVersionRepository.create({
      note_id: note.id,
      title,
      content_md,
      excerpt,
      allow_export: allow_export || false,
      audit_status: AuditStatus.DRAFT,
      created_by: userId,
    });
    await this.noteVersionRepository.save(draftVersion);

    // 更新笔记的草稿版本指针
    note.draft_version_id = draftVersion.id;
    await this.notesRepository.save(note);

    // 如果指定了用户分类，建立关联
    let noteUserCategories: NoteUserCategory[] = [];
    if (user_category_id) {
      const noteUserCategory = this.noteUserCategoryRepository.create({
        note_id: note.id,
        user_category_id,
      });
      await this.noteUserCategoryRepository.save(noteUserCategory);
      noteUserCategories = [noteUserCategory];
    }

    return { ...note, draftVersion, noteUserCategories };
  }

  // 更新笔记（更新草稿版本）
  async update(userId: string, noteId: string, updateNoteDto: UpdateNoteDto) {
    const { user_category_id, ...versionData } = updateNoteDto;

    const note = await this.notesRepository.findOne({
      where: { id: noteId },
      relations: ['draftVersion'],
    });

    if (!note) {
      throw new NotFoundException('笔记不存在');
    }

    if (note.author_id !== userId) {
      throw new ForbiddenException('无权限修改此笔记');
    }

    // 处理用户分类更新
    if (user_category_id !== undefined) {
      // 1. 删除旧的分类关联
      await this.noteUserCategoryRepository.delete({ note_id: noteId });
      
      // 2. 如果提供了新的分类ID，创建新关联
      if (user_category_id && user_category_id !== 'default') {
        const noteUserCategory = this.noteUserCategoryRepository.create({
          note_id: noteId,
          user_category_id,
        });
        await this.noteUserCategoryRepository.save(noteUserCategory);
      }
    }

    // 如果没有草稿版本，从已发布版本克隆
    if (!note.draft_version_id && note.published_version_id) {
      const publishedVersion = await this.noteVersionRepository.findOne({
        where: { id: note.published_version_id },
      });

      if (publishedVersion) {
        const newDraft = this.noteVersionRepository.create({
          ...publishedVersion,
          id: undefined,
          audit_status: AuditStatus.DRAFT,
          created_at: undefined,
        });
        await this.noteVersionRepository.save(newDraft);
        note.draft_version_id = newDraft.id;
      }
    }

    // 更新草稿版本
    if (note.draft_version_id) {
      // 只有当 versionData 有内容时才更新版本
      if (Object.keys(versionData).length > 0) {
        await this.noteVersionRepository.update(
          note.draft_version_id,
          versionData,
        );
      }
    }

    await this.notesRepository.save(note);

    return this.findOne(noteId, userId);
  }

  // 发布笔记
  async publish(userId: string, publishNoteDto: PublishNoteDto) {
    const { note_id, category_id, tag_ids, cover_url, excerpt, allow_export } =
      publishNoteDto;

    const note = await this.notesRepository.findOne({
      where: { id: note_id },
      relations: ['draftVersion'],
    });

    if (!note) {
      throw new NotFoundException('笔记不存在');
    }

    if (note.author_id !== userId) {
      throw new ForbiddenException('无权限发布此笔记');
    }

    if (!note.draftVersion) {
      throw new BadRequestException('没有可发布的草稿版本');
    }

    // 从草稿复制创建待审核版本
    const pendingVersion = this.noteVersionRepository.create({
      note_id: note.id,
      title: note.draftVersion.title,
      content_md: note.draftVersion.content_md,
      excerpt: excerpt || note.draftVersion.excerpt,
      cover_url,
      category_id,
      allow_export: allow_export ?? note.draftVersion.allow_export,
      audit_status: AuditStatus.PENDING,
      created_by: userId,
    });
    await this.noteVersionRepository.save(pendingVersion);

    // 关联标签
    if (tag_ids && tag_ids.length > 0) {
      const noteVersionTags = tag_ids.map((tag_id) =>
        this.noteVersionTagRepository.create({
          version_id: pendingVersion.id,
          tag_id,
        }),
      );
      await this.noteVersionTagRepository.save(noteVersionTags);
    }

    return { message: '提交成功，等待审核', version: pendingVersion };
  }

  // 审核笔记（管理员）
  async audit(auditorId: string, versionId: string, auditNoteDto: AuditNoteDto) {
    const { audit_status, audit_reason } = auditNoteDto;

    const version = await this.noteVersionRepository.findOne({
      where: { id: versionId },
      relations: ['note'],
    });

    if (!version) {
      throw new NotFoundException('版本不存在');
    }

    if (version.audit_status !== AuditStatus.PENDING) {
      throw new BadRequestException('该版本不在待审核状态');
    }

    // 更新审核状态
    version.audit_status = audit_status;
    version.auditor_id = auditorId;
    version.audit_reason = audit_reason || '';
    await this.noteVersionRepository.save(version);

    // 如果审核通过，更新笔记的已发布版本指针
    if (audit_status === AuditStatus.APPROVED) {
      const note = version.note;
      note.published_version_id = version.id;
      note.status = NoteStatus.PUBLISHED;
      note.published_at = new Date();
      await this.notesRepository.save(note);
    }

    return { message: '审核完成', version };
  }

  // 获取笔记列表（公开）
  async findAll(queryDto: QueryNotesDto) {
    const { category, tag, q, sort = 'new', page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.notesRepository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.publishedVersion', 'version')
      .leftJoinAndSelect('version.category', 'cat')
      .leftJoinAndSelect('version.noteVersionTags', 'nvt')
      .leftJoinAndSelect('nvt.tag', 'tag')
      .leftJoinAndSelect('note.author', 'author')
      .where('note.status = :status', { status: NoteStatus.PUBLISHED });

    // 分类筛选
    if (category && category !== '0') {
      queryBuilder.andWhere('version.category_id = :categoryId', {
        categoryId: category,
      });
    }

    // 标签筛选
    if (tag) {
      queryBuilder.andWhere('tag.id = :tagId', { tagId: tag });
    }

    // 关键词搜索
    if (q) {
      queryBuilder.andWhere(
        '(version.title LIKE :keyword OR version.content_md LIKE :keyword)',
        { keyword: `%${q}%` },
      );
    }

    // 排序
    switch (sort) {
      case 'hot':
        queryBuilder.orderBy('note.views', 'DESC');
        break;
      case 'fav':
        queryBuilder.orderBy('note.favorites_count', 'DESC');
        break;
      case 'new':
      default:
        queryBuilder.orderBy('note.published_at', 'DESC');
        break;
    }

    const [notes, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: notes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 获取单个笔记详情
  async findOne(id: string, userId?: string) {
    const note = await this.notesRepository.findOne({
      where: { id },
      relations: [
        'publishedVersion',
        'publishedVersion.category',
        'publishedVersion.noteVersionTags',
        'publishedVersion.noteVersionTags.tag',
        'author',
      ],
    });

    if (!note) {
      throw new NotFoundException('笔记不存在');
    }

    // 只有作者可以查看未发布的笔记
    if (note.status !== NoteStatus.PUBLISHED && note.author_id !== userId) {
      throw new ForbiddenException('无权限访问此笔记');
    }

    // 记录浏览历史并增加阅读量
    if (userId && note.status === NoteStatus.PUBLISHED) {
      // 检查是否已有浏览记录
      const existingHistory = await this.userNoteHistoryRepository.findOne({
        where: { user_id: userId, note_id: id },
      });

      if (existingHistory) {
        // 更新浏览时间
        existingHistory.viewed_at = new Date();
        await this.userNoteHistoryRepository.save(existingHistory);
      } else {
        // 创建新的浏览记录
        const history = this.userNoteHistoryRepository.create({
          user_id: userId,
          note_id: id,
          viewed_at: new Date(),
        });
        await this.userNoteHistoryRepository.save(history);

        // 增加阅读量
        note.views += 1;
        await this.notesRepository.save(note);
      }
    }

    return note;
  }

  // 获取用户的笔记列表（我的笔记）
  async findUserNotes(userId: string, status?: string) {
    const queryBuilder = this.notesRepository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.draftVersion', 'draftVersion')
      .leftJoinAndSelect('note.publishedVersion', 'publishedVersion')
      .leftJoinAndSelect('note.noteUserCategories', 'noteUserCategories')
      .where('note.author_id = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('note.status = :status', { status });
    }

    const notes = await queryBuilder
      .orderBy('note.updated_at', 'DESC')
      .getMany();

    return notes;
  }

  // 获取笔记的所有版本
  async getVersions(userId: string, noteId: string) {
    const note = await this.notesRepository.findOne({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException('笔记不存在');
    }

    if (note.author_id !== userId) {
      throw new ForbiddenException('无权限访问');
    }

    const versions = await this.noteVersionRepository.find({
      where: { note_id: noteId },
      order: { created_at: 'DESC' },
    });

    return versions;
  }

  // 回滚到指定版本
  async rollback(userId: string, noteId: string, versionId: string) {
    const note = await this.notesRepository.findOne({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException('笔记不存在');
    }

    if (note.author_id !== userId) {
      throw new ForbiddenException('无权限操作');
    }

    const version = await this.noteVersionRepository.findOne({
      where: { id: versionId, note_id: noteId },
    });

    if (!version) {
      throw new NotFoundException('版本不存在');
    }

    if (version.audit_status !== AuditStatus.APPROVED) {
      throw new BadRequestException('只能回滚到已审核通过的版本');
    }

    // 更新已发布版本指针
    note.published_version_id = versionId;
    await this.notesRepository.save(note);

    return { message: '回滚成功' };
  }

  // 删除笔记
  async remove(userId: string, noteId: string) {
    const note = await this.notesRepository.findOne({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException('笔记不存在');
    }

    if (note.author_id !== userId) {
      throw new ForbiddenException('无权限删除此笔记');
    }

    // 软删除
    await this.notesRepository.softRemove(note);

    return { message: '删除成功' };
  }

  // 获取待审核的笔记列表（管理员）
  async getPendingNotes(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [versions, total] = await this.noteVersionRepository.findAndCount({
      where: { audit_status: AuditStatus.PENDING },
      relations: ['note', 'note.author', 'category'],
      order: { created_at: 'ASC' },
      skip,
      take: limit,
    });

    return {
      data: versions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 用户分类（文件夹）管理
  async createUserCategory(userId: string, name: string, parent_id?: string) {
    const category = this.userCategoryRepository.create({
      user_id: userId,
      name,
      slug: name,
      parent_id,
    });

    return this.userCategoryRepository.save(category);
  }

  async getUserCategories(userId: string) {
    return this.userCategoryRepository.find({
      where: { user_id: userId },
      relations: ['children'],
      order: { created_at: 'ASC' },
    });
  }

  async updateUserCategory(
    userId: string,
    categoryId: string,
    name: string,
  ) {
    const category = await this.userCategoryRepository.findOne({
      where: { id: categoryId, user_id: userId },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    category.name = name;
    return this.userCategoryRepository.save(category);
  }

  async removeUserCategory(userId: string, categoryId: string) {
    const category = await this.userCategoryRepository.findOne({
      where: { id: categoryId, user_id: userId },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    await this.userCategoryRepository.remove(category);
    return { message: '删除成功' };
  }
}

