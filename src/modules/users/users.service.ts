import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { UserSetting } from '../../entities/user-setting.entity';
import { NoteLike } from '../../entities/note-like.entity';
import { NoteFavorite } from '../../entities/note-favorite.entity';
import { UserNoteHistory } from '../../entities/user-note-history.entity';
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

    return { avatar_url: avatarUrl };
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
      .andWhere('note.status = :status', { status: 'published' })
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
}

