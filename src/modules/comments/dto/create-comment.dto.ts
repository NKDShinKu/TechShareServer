import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ description: '笔记 ID' })
  @IsString()
  @IsNotEmpty()
  note_id: string;

  @ApiProperty({ description: '评论内容' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: '父评论 ID（回复时使用）', required: false })
  @IsString()
  @IsOptional()
  parent_id?: string;

  @ApiProperty({ description: '一级评论 ID（二级回复时使用）', required: false })
  @IsString()
  @IsOptional()
  root_id?: string;
}

