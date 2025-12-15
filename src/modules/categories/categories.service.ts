import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from '../../entities/category.entity';
import { NoteVersion } from '../../entities/note-version.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    @InjectRepository(NoteVersion)
    private noteVersionRepository: Repository<NoteVersion>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const { name, slug } = createCategoryDto;

    // 检查名称和 slug 是否已存在
    const existing = await this.categoriesRepository.findOne({
      where: [{ name }, { slug }],
    });

    if (existing) {
      throw new ConflictException('分类名称或 slug 已存在');
    }

    const category = this.categoriesRepository.create(createCategoryDto);
    return this.categoriesRepository.save(category);
  }

  async findAll() {
    // 获取所有一级分类及其子分类
    const categories = await this.categoriesRepository.find({
      where: { parent_id: IsNull(), is_public: true },
      relations: ['children'],
      order: { created_at: 'ASC' },
    });

    return categories;
  }

  async findOne(id: string) {
    const category = await this.categoriesRepository.findOne({
      where: { id },
      relations: ['children', 'parent'],
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: Partial<CreateCategoryDto>) {
    const category = await this.findOne(id);

    // 如果更新了 name 或 slug，检查唯一性
    if (updateCategoryDto.name || updateCategoryDto.slug) {
      const existing = await this.categoriesRepository
        .createQueryBuilder('category')
        .where('category.id != :id', { id })
        .andWhere(
          '(category.name = :name OR category.slug = :slug)',
          {
            name: updateCategoryDto.name || category.name,
            slug: updateCategoryDto.slug || category.slug,
          },
        )
        .getOne();

      if (existing) {
        throw new ConflictException('分类名称或 slug 已存在');
      }
    }

    Object.assign(category, updateCategoryDto);
    return this.categoriesRepository.save(category);
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    // 检查是否有子分类
    if (category.children && category.children.length > 0) {
      throw new ConflictException('该分类下有子分类，无法删除');
    }

    // 检查是否有笔记使用此分类
    const versionWithCategory = await this.noteVersionRepository.count({
      where: { category_id: id },
    });

    if (versionWithCategory > 0) {
      throw new ConflictException('该分类下有笔记，无法删除');
    }

    await this.categoriesRepository.remove(category);
    return { message: '删除成功' };
  }
}

