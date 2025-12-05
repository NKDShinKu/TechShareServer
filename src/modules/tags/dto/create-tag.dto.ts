import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ description: '标签名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'URL 友好的标识符' })
  @IsString()
  @IsNotEmpty()
  slug: string;
}

