import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNoteDto {
  @ApiProperty({ description: '笔记标题' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Markdown 内容' })
  @IsString()
  @IsNotEmpty()
  content_md: string;

  @ApiProperty({ description: '摘要', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  excerpt?: string;

  @ApiProperty({ description: '是否允许导出', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  allow_export?: boolean;

  @ApiProperty({ description: '用户分类文件夹 ID', required: false })
  @IsString()
  @IsOptional()
  user_category_id?: string;
}

