import { IsString, IsOptional, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ description: '昵称', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  nickname?: string;

  @ApiProperty({ description: '个人简介', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(256)
  bio?: string;

  @ApiProperty({ description: 'GitHub 主页', required: false })
  @IsUrl()
  @IsOptional()
  @MaxLength(128)
  github?: string;

  @ApiProperty({ description: '手机号', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  phone?: string;
}

