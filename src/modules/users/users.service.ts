import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { UserSetting } from '../../entities/user-setting.entity';
import { NoteLike } from '../../entities/note-like.entity';
import { NoteFavorite } from '../../entities/note-favorite.entity';
import { UserNoteHistory } from '../../entities/user-note-history.entity';
import { Note, NoteStatus } from '../../entities/note.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserSetting)
    private userSettingRepository: Repository<UserSetting>,
    @InjectRepository(NoteLike)
    private noteLikeRepository: Repository<NoteLike>,
    @InjectRepository(NoteFavorite)
    private noteFavoriteRepository: Repository<NoteFavorite>,
    @InjectRepository(UserNoteHistory)
    private userNoteHistoryRepository: Repository<UserNoteHistory>,
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
  ) {}

  async findOne(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: [
        'id',
        'username',
        'nickname',
        'email',
        'avatar_url',
        'bio',
        'github',
        'phone',
        'role',
        'created_at',
        'updated_at',
      ],
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 统计用户数据
    const articlesCount = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoin('user.notes', 'note')
      .where('user.id = :id', { id })
      .andWhere('note.status = :status', { status: 'published' })
      .getCount();

    const likesCount = await this.noteLikeRepository.count({
      where: { user_id: id },
    });

    return {
      ...user,
      stats: {
        articles: articlesCount,
        followers: 0, // TODO: 实现关注功能后更新
        following: 0,
        likes: likesCount,
      },
    };
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 如果更新邮箱,检查邮箱是否已被使用
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new ConflictException('该邮箱已被使用');
      }
    }

    Object.assign(user, updateUserDto);
    await this.usersRepository.save(user);

    const { password_hash, ...result } = user;
    return result;
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { oldPassword, newPassword } = changePasswordDto;

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 验证旧密码
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('旧密码错误');
    }

    // 更新密码
    user.password_hash = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.save(user);

    return { message: '密码修改成功' };
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    user.avatar_url = avatarUrl;
    await this.usersRepository.save(user);

    return { url: avatarUrl };
  }

  async getSettings(userId: string) {
    let settings = await this.userSettingRepository.findOne({
      where: { user_id: userId },
    });

    if (!settings) {
      // 如果不存在则创建默认设置
      settings = this.userSettingRepository.create({ user_id: userId });
      await this.userSettingRepository.save(settings);
    }

    return settings;
  }

  async updateSettings(userId: string, updateSettingsDto: UpdateSettingsDto) {
    let settings = await this.userSettingRepository.findOne({
      where: { user_id: userId },
    });

    if (!settings) {
      settings = this.userSettingRepository.create({
        user_id: userId,
        ...updateSettingsDto,
      });
    } else {
      Object.assign(settings, updateSettingsDto);
    }

    await this.userSettingRepository.save(settings);
    return settings;
  }

  // 获取用户文章列表
  async getUserArticles(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [articles, total] = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.notes', 'note')
      .leftJoinAndSelect('note.publishedVersion', 'version')
      .leftJoinAndSelect('version.category', 'category')
      .where('user.id = :userId', { userId })
      .andWhere('note.status = :status', { status: NoteStatus.PUBLISHED })
      .orderBy('note.published_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: articles[0]?.notes || [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 获取用户收藏列表
  async getUserFavorites(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [favorites, total] = await this.noteFavoriteRepository.findAndCount({
      where: { user_id: userId },
      relations: ['note', 'note.publishedVersion', 'note.publishedVersion.category', 'note.author'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: favorites,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 获取用户点赞列表
  async getUserLikes(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [likes, total] = await this.noteLikeRepository.findAndCount({
      where: { user_id: userId },
      relations: ['note', 'note.publishedVersion', 'note.publishedVersion.category', 'note.author'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: likes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 获取用户浏览历史
  async getUserHistory(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [history, total] = await this.userNoteHistoryRepository.findAndCount({
      where: { user_id: userId },
      relations: ['note', 'note.publishedVersion', 'note.publishedVersion.category', 'note.author'],
      order: { viewed_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: history,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 删除浏览历史
  async deleteHistory(userId: string, noteId?: string) {
    if (noteId) {
      await this.userNoteHistoryRepository.delete({
        user_id: userId,
        note_id: noteId,
      });
    } else {
      await this.userNoteHistoryRepository.delete({ user_id: userId });
    }

    return { message: '删除成功' };
  }

  // 获取创作者数据统计
  async getCreatorStats(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 统计用户的所有已发布笔记
    const notes = await this.notesRepository.find({
      where: {
        author_id: userId,
        status: NoteStatus.PUBLISHED,
        deleted_at: IsNull(),
      },
    });

    // 计算总数
    const totalViews = notes.reduce((sum, note) => sum + note.views, 0);
    const totalLikes = notes.reduce((sum, note) => sum + note.likes_count, 0);
    const totalComments = notes.reduce((sum, note) => sum + note.comments_count, 0);
    const totalFavorites = notes.reduce((sum, note) => sum + note.favorites_count, 0);

    // 计算创作天数
    const joinDays = Math.floor(
      (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      totalArticles: notes.length,
      totalViews,
      totalLikes,
      totalComments,
      totalFavorites,
      joinDays,
    };
  }

  // 获取创作者图表数据
  async getCreatorChartData(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 获取最近30天的日期
    const dates: string[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    // 获取用户所有已发布笔记
    const notes = await this.notesRepository.find({
      where: {
        author_id: userId,
        status: NoteStatus.PUBLISHED,
        deleted_at: IsNull(),
      },
      relations: ['publishedVersion', 'publishedVersion.category'],
    });

    // 统计每天的发布数量
    const publishTrend = dates.map((date) => {
      const count = notes.filter((note) => {
        if (!note.published_at) return false;
        const publishDate = new Date(note.published_at)
          .toISOString()
          .split('T')[0];
        return publishDate === date;
      }).length;
      return count;
    });

    // 统计互动趋势（点赞+评论+收藏）
    const interactionTrend = dates.map((date) => {
      // 计算该日期及之前发布的所有文章的互动总数
      const interactions = notes
        .filter((note) => {
          if (!note.published_at) return false;
          const publishDate = new Date(note.published_at);
          const currentDate = new Date(date);
          return publishDate <= currentDate;
        })
        .reduce((sum, note) => {
          return sum + note.likes_count + note.comments_count + note.favorites_count;
        }, 0);
      return interactions;
    });

    // 获取文章数据对比（取前10篇）
    const topNotes = notes
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)
      .map((note) => ({
        title: note.publishedVersion?.title || '未命名',
        views: note.views,
        likes: note.likes_count,
        comments: note.comments_count,
        favorites: note.favorites_count,
      }));

    // 统计分类分布
    const categoryMap = new Map<string, number>();
    notes.forEach((note) => {
      const categoryName =
        note.publishedVersion?.category?.name || '未分类';
      categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1);
    });

    const categoryDistribution = Array.from(categoryMap.entries()).map(
      ([name, value]) => ({
        name,
        value,
      }),
    );

    return {
      publishTrend: {
        dates,
        values: publishTrend,
      },
      interactionTrend: {
        dates,
        values: interactionTrend,
      },
      topNotes,
      categoryDistribution,
    };
  }
}
