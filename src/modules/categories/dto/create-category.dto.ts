import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ description: '分类名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'URL 友好的标识符' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ description: '父分类 ID', required: false })
  @IsString()
  @IsOptional()
  parent_id?: string;

  @ApiProperty({ description: '是否公开', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  is_public?: boolean;
}

