import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification, NotificationType } from '../../entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
  ) {}

  // 创建通知
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    content: string,
    actorUserId?: string,
    noteId?: string,
    commentId?: string,
  ) {
    const notification = this.notificationsRepository.create({
      user_id: userId,
      type,
      title,
      content,
      actor_user_id: actorUserId,
      note_id: noteId,
      comment_id: commentId,
    });

    return this.notificationsRepository.save(notification);
  }

  // 获取用户通知列表
  async findAll(
    userId: string,
    type?: NotificationType,
    types?: NotificationType[],  // 支持查询多种类型
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const queryBuilder = this.notificationsRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.actorUser', 'actorUser')
      .leftJoinAndSelect('notification.note', 'note')
      .leftJoinAndSelect('note.publishedVersion', 'publishedVersion')
      .leftJoinAndSelect('notification.comment', 'comment')
      .where('notification.user_id = :userId', { userId });

    // 支持查询单个类型或多个类型
    if (types && types.length > 0) {
      // 确保 types 是数组
      const typeArray = Array.isArray(types) ? types : [types];
      queryBuilder.andWhere('notification.type IN (:...types)', { types: typeArray });
    } else if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    const [notifications, total] = await queryBuilder
      .orderBy('notification.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const unreadCount = await this.notificationsRepository.count({
      where: { user_id: userId, is_read: false },
    });

    return {
      data: notifications,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 标记为已读
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId, user_id: userId },
    });

    if (!notification) {
      throw new NotFoundException('通知不存在');
    }

    notification.is_read = true;
    notification.read_at = new Date();
    await this.notificationsRepository.save(notification);

    return { message: '标记成功' };
  }

  // 批量标记为已读
  async markAllAsRead(userId: string, ids?: string[]) {
    const queryBuilder = this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ is_read: true, read_at: new Date() })
      .where('user_id = :userId', { userId });

    if (ids && ids.length > 0) {
      queryBuilder.andWhere('id IN (:...ids)', { ids });
    } else {
      queryBuilder.andWhere('is_read = :isRead', { isRead: false });
    }

    await queryBuilder.execute();

    return { message: '标记成功' };
  }

  // 获取未读数量
  async getUnreadCount(userId: string) {
    const [total, system, comment, reply, like, favorite, mention] = await Promise.all([
      this.notificationsRepository.count({
        where: { user_id: userId, is_read: false },
      }),
      this.notificationsRepository.count({
        where: { user_id: userId, is_read: false, type: NotificationType.SYSTEM },
      }),
      this.notificationsRepository.count({
        where: { user_id: userId, is_read: false, type: NotificationType.COMMENT },
      }),
      this.notificationsRepository.count({
        where: { user_id: userId, is_read: false, type: NotificationType.REPLY },
      }),
      this.notificationsRepository.count({
        where: { user_id: userId, is_read: false, type: NotificationType.LIKE },
      }),
      this.notificationsRepository.count({
        where: { user_id: userId, is_read: false, type: NotificationType.FAVORITE },
      }),
      this.notificationsRepository.count({
        where: { user_id: userId, is_read: false, type: NotificationType.MENTION },
      }),
    ]);

    return {
      count: total, // 兼容旧字段
      total,
      system,
      comments: comment + reply, // 合并评论和回复
      likes: like,
      favorites: favorite,
      mentions: mention,
    };
  }

  // 删除通知
  async remove(userId: string, notificationId: string) {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId, user_id: userId },
    });

    if (!notification) {
      throw new NotFoundException('通知不存在');
    }

    await this.notificationsRepository.remove(notification);
    return { message: '删除成功' };
  }

  // Broadcast notification to all users
  async broadcast(
    type: NotificationType,
    title: string,
    content: string,
    actorUserId?: string,
  ) {
    await this.notificationsRepository.query(`
      INSERT INTO notifications (user_id, type, title, content, actor_user_id, created_at)
      SELECT id, ?, ?, ?, ?, NOW() FROM users
    `, [type, title, content, actorUserId || null]);
    
    return { message: 'Broadcast successful' };
  }
}

