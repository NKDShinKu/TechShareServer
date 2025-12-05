import { IsOptional, IsString, IsIn, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class QueryNotesDto {
  @ApiProperty({ description: '分类 ID', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: '标签 ID', required: false })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiProperty({ description: '搜索关键词', required: false })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({ description: '排序方式', required: false, enum: ['hot', 'new', 'fav'] })
  @IsOptional()
  @IsIn(['hot', 'new', 'fav'])
  sort?: string;

  @ApiProperty({ description: '页码', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}

