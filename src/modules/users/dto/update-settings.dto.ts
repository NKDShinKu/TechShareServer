import { IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ThemeMode, EditorTheme } from '../../../entities/user-setting.entity';

export class UpdateSettingsDto {
  @ApiProperty({ enum: ThemeMode, required: false })
  @IsEnum(ThemeMode)
  @IsOptional()
  theme?: ThemeMode;

  @ApiProperty({ enum: EditorTheme, required: false })
  @IsEnum(EditorTheme)
  @IsOptional()
  editor_theme?: EditorTheme;

  @ApiProperty({ description: '编辑器偏好设置', required: false })
  @IsObject()
  @IsOptional()
  editor_prefs?: object;
}

