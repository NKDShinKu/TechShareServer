import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from '../../entities/tag.entity';
import { NoteVersionTag } from '../../entities/note-version-tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private tagsRepository: Repository<Tag>,
    @InjectRepository(NoteVersionTag)
    private noteVersionTagRepository: Repository<NoteVersionTag>,
  ) {}

  async create(createTagDto: CreateTagDto) {
    const { name, slug } = createTagDto;

    // 检查名称和 slug 是否已存在
    const existing = await this.tagsRepository.findOne({
      where: [{ name }, { slug }],
    });

    if (existing) {
      throw new ConflictException('标签名称或 slug 已存在');
    }

    const tag = this.tagsRepository.create(createTagDto);
    return this.tagsRepository.save(tag);
  }

  async findAll(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [tags, total] = await this.tagsRepository.findAndCount({
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: tags,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const tag = await this.tagsRepository.findOne({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException('标签不存在');
    }

    return tag;
  }

  async findBySlug(slug: string) {
    const tag = await this.tagsRepository.findOne({
      where: { slug },
    });

    if (!tag) {
      throw new NotFoundException('标签不存在');
    }

    return tag;
  }

  async update(id: string, updateTagDto: Partial<CreateTagDto>) {
    const tag = await this.findOne(id);

    // 如果更新了 name 或 slug，检查唯一性
    if (updateTagDto.name || updateTagDto.slug) {
      const existing = await this.tagsRepository
        .createQueryBuilder('tag')
        .where('tag.id != :id', { id })
        .andWhere(
          '(tag.name = :name OR tag.slug = :slug)',
          {
            name: updateTagDto.name || tag.name,
            slug: updateTagDto.slug || tag.slug,
          },
        )
        .getOne();

      if (existing) {
        throw new ConflictException('标签名称或 slug 已存在');
      }
    }

    Object.assign(tag, updateTagDto);
    return this.tagsRepository.save(tag);
  }

  async remove(id: string) {
    const tag = await this.findOne(id);

    // 检查是否有笔记使用此标签
    const versionTagsCount = await this.noteVersionTagRepository.count({
      where: { tag_id: id },
    });

    if (versionTagsCount > 0) {
      throw new ConflictException('该标签下有笔记，无法删除');
    }

    await this.tagsRepository.remove(tag);
    return { message: '删除成功' };
  }

  // 获取热门标签
  async getPopularTags(limit = 20) {
    const tags = await this.tagsRepository
      .createQueryBuilder('tag')
      .leftJoin('tag.noteVersionTags', 'noteVersionTag')
      .select('tag.*')
      .addSelect('COUNT(noteVersionTag.version_id)', 'count')
      .groupBy('tag.id')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return tags;
  }
}

