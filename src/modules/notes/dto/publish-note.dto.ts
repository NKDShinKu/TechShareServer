import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MaxLength,
  IsBoolean,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PublishNoteDto {
  @ApiProperty({ description: '笔记 ID' })
  @IsString()
  @IsNotEmpty()
  note_id: string;

  @ApiProperty({ description: '分类 ID' })
  @IsString()
  @IsNotEmpty()
  category_id: string;

  @ApiProperty({ description: '标签 ID 列表（最多2个）' })
  @IsArray()
  @ArrayMaxSize(2)
  @IsString({ each: true })
  tag_ids: string[];

  @ApiProperty({ description: '封面图 URL', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  cover_url?: string;

  @ApiProperty({ description: '摘要', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  excerpt?: string;

  @ApiProperty({ description: '是否允许导出', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  allow_export?: boolean;

  @ApiProperty({ description: '历史版本ID（如果指定，则直接发布该版本而不需审核）', required: false })
  @IsString()
  @IsOptional()
  version_id?: string;
}

