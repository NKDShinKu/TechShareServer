import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get('UPLOAD_DEST') || './uploads';
    this.ensureUploadDirExists();
  }

  private ensureUploadDirExists() {
    const dirs = [
      this.uploadDir,
      path.join(this.uploadDir, 'avatars'),
      path.join(this.uploadDir, 'covers'),
      path.join(this.uploadDir, 'attachments'),
    ];

    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async uploadAvatar(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }

    // 验证文件类型
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('只支持 jpg、png、gif、webp 格式的图片');
    }

    // 验证文件大小（2MB）
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('文件大小不能超过 2MB');
    }

    const filename = `avatar_${Date.now()}_${file.originalname}`;
    const filePath = path.join(this.uploadDir, 'avatars', filename);

    fs.writeFileSync(filePath, file.buffer);

    return {
      url: `/uploads/avatars/${filename}`,
      filename,
    };
  }

  async uploadCover(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }

    // 验证文件类型
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('只支持 jpg、png、gif、webp 格式的图片');
    }

    // 验证文件大小（5MB）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('文件大小不能超过 5MB');
    }

    const filename = `cover_${Date.now()}_${file.originalname}`;
    const filePath = path.join(this.uploadDir, 'covers', filename);

    fs.writeFileSync(filePath, file.buffer);

    return {
      url: `/uploads/covers/${filename}`,
      filename,
    };
  }

  async uploadAttachment(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }

    // 验证文件大小（10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('文件大小不能超过 10MB');
    }

    const filename = `attachment_${Date.now()}_${file.originalname}`;
    const filePath = path.join(this.uploadDir, 'attachments', filename);

    fs.writeFileSync(filePath, file.buffer);

    return {
      url: `/uploads/attachments/${filename}`,
      filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  async deleteFile(filePath: string) {
    const fullPath = path.join(process.cwd(), filePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return { message: '删除成功' };
    }

    return { message: '文件不存在' };
  }
}

