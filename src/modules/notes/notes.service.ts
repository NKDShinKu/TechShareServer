import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, Brackets } from 'typeorm';
import { Note, NoteStatus } from '../../entities/note.entity';
import { NoteVersion, VersionType } from '../../entities/note-version.entity';
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

  // ==================== 辅助方法 ====================

  // 复制版本内容
  private async copyVersion(
    sourceVersion: NoteVersion,
    noteId: string,
    userId: string,
    versionType: VersionType,
  ): Promise<NoteVersion> {
    const newVersion = this.noteVersionRepository.create({
      note_id: noteId,
      title: sourceVersion.title,
      content_md: sourceVersion.content_md,
      content_html: sourceVersion.content_html,
      excerpt: sourceVersion.excerpt,
      cover_url: sourceVersion.cover_url,
      category_id: sourceVersion.category_id,
      allow_export: sourceVersion.allow_export,
      version_type: versionType,
      created_by: userId,
    });
    await this.noteVersionRepository.save(newVersion);

    // 复制标签关联
    if (sourceVersion.noteVersionTags && sourceVersion.noteVersionTags.length > 0) {
      const newTags = sourceVersion.noteVersionTags.map((nvt) =>
        this.noteVersionTagRepository.create({
          version_id: newVersion.id,
          tag_id: nvt.tag_id,
        }),
      );
      await this.noteVersionTagRepository.save(newTags);
    }

    return newVersion;
  }

  // 计算笔记状态
  private calculateStatus(note: Note): NoteStatus {
    if (note.pending_version_id) {
      // 有待审核内容
      return note.audit_reason ? NoteStatus.REJECTED : NoteStatus.PENDING;
    }
    if (note.published_version_id) {
      return NoteStatus.PUBLISHED;
    }
    return NoteStatus.DRAFT;
  }

  // ==================== 创建笔记 ====================

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
      version_type: VersionType.DRAFT,
      created_by: userId,
    });
    await this.noteVersionRepository.save(draftVersion);

    // 更新笔记的草稿版本指针
    note.draft_version_id = draftVersion.id;
    await this.notesRepository.save(note);

    // 如果指定了用户分类，建立关联
    if (user_category_id) {
      const noteUserCategory = this.noteUserCategoryRepository.create({
        note_id: note.id,
        user_category_id,
      });
      await this.noteUserCategoryRepository.save(noteUserCategory);
    }

    return { ...note, draftVersion };
  }

  // ==================== 更新笔记（草稿） ====================

  async update(userId: string, noteId: string, updateNoteDto: UpdateNoteDto) {
    const { user_category_id, ...versionData } = updateNoteDto;

    const note = await this.notesRepository.findOne({
      where: { id: noteId },
      relations: ['draftVersion', 'publishedVersion'],
    });

    if (!note) {
      throw new NotFoundException('笔记不存在');
    }

    if (note.author_id !== userId) {
      throw new ForbiddenException('无权限修改此笔记');
    }

    // 处理用户分类更新
    if (user_category_id !== undefined) {
      await this.noteUserCategoryRepository.delete({ note_id: noteId });
      if (user_category_id && user_category_id !== 'default') {
        const noteUserCategory = this.noteUserCategoryRepository.create({
          note_id: noteId,
          user_category_id,
        });
        await this.noteUserCategoryRepository.save(noteUserCategory);
      }
    }

    // 如果没有草稿版本，从已发布版本克隆一份
    if (!note.draft_version_id && note.published_version_id) {
      const publishedVersion = await this.noteVersionRepository.findOne({
        where: { id: note.published_version_id },
        relations: ['noteVersionTags'],
      });

      if (publishedVersion) {
        const newDraft = await this.copyVersion(
          publishedVersion,
          note.id,
          userId,
          VersionType.DRAFT,
        );
        note.draft_version_id = newDraft.id;
        await this.notesRepository.save(note);
      }
    }

    // 更新草稿版本（不影响审核中或已发布的内容）
    if (note.draft_version_id && Object.keys(versionData).length > 0) {
      await this.noteVersionRepository.update(note.draft_version_id, versionData);
    }

    return this.findOneForAuthor(noteId, userId);
  }

  // ==================== 发布笔记（提交审核） ====================

  async publish(userId: string, publishNoteDto: PublishNoteDto) {
    const { note_id, category_id, tag_ids, cover_url, excerpt, allow_export, version_id } = publishNoteDto;

    const note = await this.notesRepository.findOne({
      where: { id: note_id },
      relations: ['draftVersion', 'draftVersion.noteVersionTags'],
    });

    if (!note) {
      throw new NotFoundException('笔记不存在');
    }

    if (note.author_id !== userId) {
      throw new ForbiddenException('无权限发布此笔记');
    }

    // 如果指定了历史版本ID，则直接发布该版本（不需审核）
    if (version_id) {
      const historyVersion = await this.noteVersionRepository.findOne({
        where: { 
          id: version_id, 
          note_id: note_id,
          version_type: VersionType.PUBLISHED,
        },
        relations: ['noteVersionTags'],
      });

      if (!historyVersion) {
        throw new NotFoundException('指定的历史版本不存在');
      }

      // 删除旧的待审核版本（如果有）
      if (note.pending_version_id) {
        await this.noteVersionTagRepository.delete({ version_id: note.pending_version_id });
        await this.noteVersionRepository.delete({ id: note.pending_version_id });
      }

      // 直接设置为已发布状态
      note.published_version_id = version_id;
      note.pending_version_id = null;
      note.audit_reason = null;
      note.status = NoteStatus.PUBLISHED;
      note.published_at = new Date();
      await this.notesRepository.save(note);

      return { message: '发布成功', note };
    }

    // 否则按原有逻辑：从草稿创建待审核版本
    if (!note.draftVersion) {
      throw new BadRequestException('没有可发布的草稿版本');
    }

    // 不能重复提交审核
    if (note.status === NoteStatus.PENDING) {
      throw new BadRequestException('笔记正在审核中，请勿重复提交');
    }

    // 更新草稿版本的发布信息
    const draftVersion = note.draftVersion;
    draftVersion.category_id = category_id;
    draftVersion.cover_url = cover_url || draftVersion.cover_url;
    draftVersion.excerpt = excerpt || draftVersion.excerpt;
    draftVersion.allow_export = allow_export ?? draftVersion.allow_export;
    await this.noteVersionRepository.save(draftVersion);

    // 更新草稿版本的标签
    await this.noteVersionTagRepository.delete({ version_id: draftVersion.id });
    if (tag_ids && tag_ids.length > 0) {
      const noteVersionTags = tag_ids.map((tag_id) =>
        this.noteVersionTagRepository.create({
          version_id: draftVersion.id,
          tag_id,
        }),
      );
      await this.noteVersionTagRepository.save(noteVersionTags);
    }

    // 重新加载草稿版本以获取标签
    const updatedDraft = await this.noteVersionRepository.findOne({
      where: { id: draftVersion.id },
      relations: ['noteVersionTags'],
    });

    // 删除旧的待审核版本
    if (note.pending_version_id) {
      await this.noteVersionTagRepository.delete({ version_id: note.pending_version_id });
      await this.noteVersionRepository.delete({ id: note.pending_version_id });
    }

    // 从草稿复制创建待审核版本
    const pendingVersion = await this.copyVersion(
      updatedDraft as NoteVersion,
      note.id,
      userId,
      VersionType.PENDING,
    );

    // 更新笔记状态
    note.pending_version_id = pendingVersion.id;
    note.status = NoteStatus.PENDING;
    note.audit_reason = null; // 清除之前的拒绝原因
    await this.notesRepository.save(note);

    return { message: '提交成功，等待审核', note };
  }

  // ==================== 取消审核/删除提交 ====================

  async cancelPending(userId: string, noteId: string) {
    const note = await this.notesRepository.findOne({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException('笔记不存在');
    }

    if (note.author_id !== userId) {
      throw new ForbiddenException('无权限操作');
    }

    if (!note.pending_version_id) {
      throw new BadRequestException('没有待审核的内容');
    }

    // 删除待审核版本
    await this.noteVersionTagRepository.delete({ version_id: note.pending_version_id });
    await this.noteVersionRepository.delete({ id: note.pending_version_id });

    // 更新笔记状态
    note.pending_version_id = null;
    note.audit_reason = null;
    note.status = this.calculateStatus(note);
    await this.notesRepository.save(note);

    return { message: '已取消', note };
  }

  // ==================== 删除发布（取消发布） ====================

  async unpublish(userId: string, noteId: string) {
    const note = await this.notesRepository.findOne({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException('笔记不存在');
    }

    if (note.author_id !== userId) {
      throw new ForbiddenException('无权限操作');
    }

    if (!note.published_version_id) {
      throw new BadRequestException('笔记未发布');
    }

    // 清空已发布版本指针和待审核版本指针（不删除版本记录，保留历史）
    // 删除待审核版本（如果有）
    if (note.pending_version_id) {
      await this.noteVersionTagRepository.delete({ version_id: note.pending_version_id });
      await this.noteVersionRepository.delete({ id: note.pending_version_id });
    }

    note.published_version_id = null;
    note.published_at = null;
    note.pending_version_id = null;
    note.audit_reason = null;
    note.status = NoteStatus.DRAFT; // 删除发布后变为草稿状态
    await this.notesRepository.save(note);

    return { message: '已取消发布', note };
  }

  // ==================== 审核笔记（管理员） ====================

  async audit(auditorId: string, noteId: string, auditNoteDto: AuditNoteDto) {
    const { audit_status, audit_reason } = auditNoteDto;

    const note = await this.notesRepository.findOne({
      where: { id: noteId },
      relations: ['pendingVersion', 'pendingVersion.noteVersionTags'],
    });

    if (!note) {
      throw new NotFoundException('笔记不存在');
    }

    if (note.status !== NoteStatus.PENDING) {
      throw new BadRequestException('该笔记不在待审核状态');
    }

    if (!note.pendingVersion) {
      throw new BadRequestException('没有待审核的内容');
    }

    note.auditor_id = auditorId;

    if (audit_status === 'approved') {
      // 审核通过：从待审核版本创建已发布版本
      const pendingVersionId = note.pending_version_id!; // 已在上面检查过非空
      const publishedVersion = await this.copyVersion(
        note.pendingVersion,
        note.id,
        note.pendingVersion.created_by,
        VersionType.PUBLISHED,
      );

      // 删除待审核版本
      await this.noteVersionTagRepository.delete({ version_id: pendingVersionId });
      await this.noteVersionRepository.delete({ id: pendingVersionId });

      // 更新笔记状态
      note.published_version_id = publishedVersion.id;
      note.pending_version_id = null;
      note.audit_reason = null;
      note.status = NoteStatus.PUBLISHED;
      note.published_at = new Date();
      
    } else {
      // 审核拒绝
      note.status = NoteStatus.REJECTED;
      note.audit_reason = audit_reason || '审核未通过';
    }

    await this.notesRepository.save(note);

    return { message: '审核完成', note };
  }

  // ==================== 获取笔记列表（公开） ====================

  async findAll(queryDto: QueryNotesDto) {
    const { category, tag, q, sort = 'new', page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    // 关键改动：查询有已发布版本的笔记
    const queryBuilder = this.notesRepository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.publishedVersion', 'version')
      .leftJoinAndSelect('version.category', 'cat')
      .leftJoinAndSelect('version.noteVersionTags', 'nvt')
      .leftJoinAndSelect('nvt.tag', 'tag')
      .leftJoinAndSelect('note.author', 'author')
      .where('note.published_version_id IS NOT NULL'); // 只要有已发布版本就显示

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

  // ==================== 获取单个笔记详情（公开访问） ====================

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

    // 检查是否有已发布版本，或者是作者本人
    if (!note.published_version_id && note.author_id !== userId) {
      throw new ForbiddenException('无权限访问此笔记');
    }

    // 记录浏览历史并增加阅读量
    if (note.published_version_id) {
      // 每次访问都增加阅读数
      note.views += 1;
      await this.notesRepository.save(note);

      // 如果用户已登录，记录浏览历史
      if (userId) {
        const existingHistory = await this.userNoteHistoryRepository.findOne({
          where: { user_id: userId, note_id: id },
        });

        if (existingHistory) {
          // 已访问过，只更新时间
          existingHistory.viewed_at = new Date();
          await this.userNoteHistoryRepository.save(existingHistory);
        } else {
          // 首次访问，记录历史
          const history = this.userNoteHistoryRepository.create({
            user_id: userId,
            note_id: id,
            viewed_at: new Date(),
          });
          await this.userNoteHistoryRepository.save(history);
        }
      }
    }

    return note;
  }

  // ==================== 获取单个笔记详情（作者用） ====================

  async findOneForAuthor(id: string, userId: string) {
    const note = await this.notesRepository.findOne({
      where: { id },
      relations: [
        'draftVersion',
        'draftVersion.category',
        'draftVersion.noteVersionTags',
        'draftVersion.noteVersionTags.tag',
        'pendingVersion',
        'pendingVersion.category',
        'pendingVersion.noteVersionTags',
        'pendingVersion.noteVersionTags.tag',
        'publishedVersion',
        'publishedVersion.category',
        'publishedVersion.noteVersionTags',
        'publishedVersion.noteVersionTags.tag',
        'noteUserCategories',
        'author',
      ],
    });

    if (!note) {
      throw new NotFoundException('笔记不存在');
    }

    if (note.author_id !== userId) {
      throw new ForbiddenException('无权限访问此笔记');
    }

    return note;
  }

  // ==================== 获取用户的笔记列表（我的笔记） ====================

  async findUserNotes(userId: string, status?: string) {
    const queryBuilder = this.notesRepository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.draftVersion', 'draftVersion')
      .leftJoinAndSelect('note.pendingVersion', 'pendingVersion')
      .leftJoinAndSelect('note.publishedVersion', 'publishedVersion')
      .leftJoinAndSelect('note.noteUserCategories', 'noteUserCategories')
      .leftJoinAndSelect('publishedVersion.category', 'publishedCategory')
      .leftJoinAndSelect('publishedVersion.noteVersionTags', 'publishedNvt')
      .leftJoinAndSelect('publishedNvt.tag', 'publishedTag')
      .leftJoinAndSelect('pendingVersion.category', 'pendingCategory')
      .leftJoinAndSelect('pendingVersion.noteVersionTags', 'pendingNvt')
      .leftJoinAndSelect('pendingNvt.tag', 'pendingTag')
      .leftJoinAndSelect('draftVersion.category', 'draftCategory')
      .leftJoinAndSelect('draftVersion.noteVersionTags', 'draftNvt')
      .leftJoinAndSelect('draftNvt.tag', 'draftTag')
      .where('note.author_id = :userId', { userId });

    // 按笔记主表状态筛选
    if (status) {
      const statuses = status.split(',');
      
      // 特殊处理 published 状态：只返回 published 状态或有 published_version_id 的
      if (statuses.includes('published') && statuses.length === 1) {
        queryBuilder.andWhere('note.published_version_id IS NOT NULL');
      } else {
        queryBuilder.andWhere('note.status IN (:...statuses)', { statuses });
      }
    }

    const notes = await queryBuilder
      .orderBy('note.updated_at', 'DESC')
      .getMany();

    return notes;
  }

  // ==================== 获取笔记已发布版本列表（用于回滚） ====================

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

    // 只返回已发布的版本
    const versions = await this.noteVersionRepository.find({
      where: { 
        note_id: noteId,
        version_type: VersionType.PUBLISHED,
      },
      relations: ['category', 'noteVersionTags', 'noteVersionTags.tag'],
      order: { created_at: 'DESC' },
    });

    // 标记当前发布版本
    return versions.map(v => ({
      ...v,
      is_current: v.id === note.published_version_id,
    }));
  }

  // ==================== 回滚到指定版本 ====================

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
      where: { 
        id: versionId, 
        note_id: noteId,
        version_type: VersionType.PUBLISHED,
      },
    });

    if (!version) {
      throw new NotFoundException('版本不存在或不可回滚');
    }

    // 更新已发布版本指针
    note.published_version_id = versionId;
    await this.notesRepository.save(note);

    return { message: '回滚成功' };
  }

  // ==================== 删除笔记 ====================

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

    await this.notesRepository.softRemove(note);

    return { message: '删除成功' };
  }

  // ==================== 获取待审核笔记列表（管理员） ====================

  async getPendingNotes(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [notes, total] = await this.notesRepository.findAndCount({
      where: { status: NoteStatus.PENDING },
      relations: [
        'author',
        'pendingVersion',
        'pendingVersion.category',
        'pendingVersion.noteVersionTags',
        'pendingVersion.noteVersionTags.tag',
      ],
      order: { updated_at: 'ASC' },
      skip,
      take: limit,
    });

    return {
      data: notes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== 用户分类（文件夹）管理 ====================

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

  async updateUserCategory(userId: string, categoryId: string, name: string) {
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

  // Admin: Get notes by status
  async getAdminNotes(page = 1, limit = 10, status?: string, search?: string) {
    const skip = (page - 1) * limit;
    const query = this.notesRepository.createQueryBuilder('note')
      .leftJoinAndSelect('note.author', 'author')
      .leftJoinAndSelect('note.publishedVersion', 'publishedVersion')
      .leftJoinAndSelect('note.pendingVersion', 'pendingVersion')
      .leftJoinAndSelect('note.draftVersion', 'draftVersion')
      .leftJoinAndSelect('publishedVersion.category', 'publishedCategory')
      .leftJoinAndSelect('pendingVersion.category', 'pendingCategory');

    if (status) {
      query.where('note.status = :status', { status });
    }
    
    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('publishedVersion.title LIKE :search')
            .orWhere('pendingVersion.title LIKE :search')
            .orWhere('draftVersion.title LIKE :search');
        }),
        { search: `%${search}%` },
      );
    }

    const [notes, total] = await query
      .orderBy('note.created_at', 'DESC')
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
}
