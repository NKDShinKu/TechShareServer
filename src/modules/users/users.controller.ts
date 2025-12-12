import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UploadService } from '../upload/upload.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../entities/user.entity';

@ApiTags('用户')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly uploadService: UploadService,
  ) {}

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '获取用户信息' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get('me/info')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  async getMyInfo(@CurrentUser('id') userId: string) {
    return this.usersService.findOne(userId);
  }

  @Put('me/profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新个人资料' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(userId, updateUserDto);
  }

  @Post('me/change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改密码' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, changePasswordDto);
  }

  @Post('me/avatar')
  @ApiBearerAuth()
  @ApiOperation({ summary: '上传头像' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // 使用 UploadService 处理文件上传
    const uploadResult = await this.uploadService.uploadAvatar(file);
    // 更新用户头像 URL
    return this.usersService.updateAvatar(userId, uploadResult.url);
  }

  @Get('me/settings')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户设置' })
  async getSettings(@CurrentUser('id') userId: string) {
    return this.usersService.getSettings(userId);
  }

  @Put('me/settings')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新用户设置' })
  async updateSettings(
    @CurrentUser('id') userId: string,
    @Body() updateSettingsDto: UpdateSettingsDto,
  ) {
    return this.usersService.updateSettings(userId, updateSettingsDto);
  }

  @Public()
  @Get(':id/articles')
  @ApiOperation({ summary: '获取用户文章列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserArticles(
    @Param('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.usersService.getUserArticles(userId, page, limit);
  }

  @Get('me/favorites')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户收藏列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyFavorites(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.usersService.getUserFavorites(userId, page, limit);
  }

  @Get('me/creator-stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取创作者数据统计' })
  async getCreatorStats(@CurrentUser('id') userId: string) {
    return this.usersService.getCreatorStats(userId);
  }

  @Get('me/creator-chart-data')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取创作者图表数据' })
  async getCreatorChartData(@CurrentUser('id') userId: string) {
    return this.usersService.getCreatorChartData(userId);
  }

  @Get('me/user-favorites')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户收藏列表详情' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserFavorites(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.usersService.getUserFavorites(userId, page, limit);
  }

  @Get('me/likes')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户点赞列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserLikes(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.usersService.getUserLikes(userId, page, limit);
  }

  @Get('me/history')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取浏览历史' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserHistory(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.usersService.getUserHistory(userId, page, limit);
  }

  @Delete('me/history')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除浏览历史' })
  @ApiQuery({ name: 'noteId', required: false, type: String })
  async deleteHistory(
    @CurrentUser('id') userId: string,
    @Query('noteId') noteId?: string,
  ) {
    return this.usersService.deleteHistory(userId, noteId);
  }

  @Get('admin/list')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取所有用户（管理员）' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAllUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAllUsers(page, limit, search);
  }

  @Put('admin/:id/role')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '修改用户角色（管理员）' })
  async updateUserRole(
    @Param('id') userId: string,
    @Body() body: { role: UserRole },
  ) {
    return this.usersService.updateUserRole(userId, body.role);
  }

  @Get('admin/stats')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取仪表盘统计数据（管理员）' })
  async getDashboardStats() {
    return this.usersService.getDashboardStats();
  }

  @Put('admin/:id/profile')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '修改用户信息（管理员）' })
  async adminUpdateProfile(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.adminUpdateProfile(userId, updateUserDto);
  }

  @Post('admin/:id/reset-password')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '重置用户密码（管理员）' })
  async adminResetPassword(
    @Param('id') userId: string,
    @Body() body: { password: string },
  ) {
    return this.usersService.adminResetPassword(userId, body.password);
  }
}

