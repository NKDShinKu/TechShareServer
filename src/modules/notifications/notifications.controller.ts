import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationType } from '../../entities/notification.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../entities/user.entity';

@ApiTags('通知')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: '获取通知列表' })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType })
  @ApiQuery({ name: 'types', required: false, description: '多个类型用逗号分隔，如: comment,reply' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser('id') userId: string,
    @Query('type') type?: NotificationType,
    @Query('types') typesParam?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    // 将逗号分隔的字符串转换为数组
    const types = typesParam ? typesParam.split(',') as NotificationType[] : undefined;
    return this.notificationsService.findAll(userId, type, types, page, limit);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '获取未读数量' })
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Post(':id/read')
  @ApiOperation({ summary: '标记为已读' })
  markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(userId, notificationId);
  }

  @Post('batch-read')
  @ApiOperation({ summary: '批量标记为已读' })
  markAllAsRead(
    @CurrentUser('id') userId: string,
    @Body() body?: { ids?: string[] },
  ) {
    return this.notificationsService.markAllAsRead(userId, body?.ids);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除通知' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.remove(userId, notificationId);
  }

  @Post('admin/broadcast')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '发送系统广播（管理员）' })
  async broadcast(
    @CurrentUser('id') userId: string,
    @Body() body: { title: string; content: string },
  ) {
    return this.notificationsService.broadcast(
      NotificationType.SYSTEM,
      body.title,
      body.content,
      userId,
    );
  }
}

