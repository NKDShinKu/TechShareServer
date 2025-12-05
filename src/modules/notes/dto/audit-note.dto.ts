import { IsString, IsNotEmpty, IsIn, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuditStatus } from '../../../entities/note-version.entity';

export class AuditNoteDto {
  @ApiProperty({ enum: AuditStatus, description: '审核状态' })
  @IsString()
  @IsNotEmpty()
  @IsIn([AuditStatus.APPROVED, AuditStatus.REJECTED])
  audit_status: AuditStatus;

  @ApiProperty({ description: '审核原因（拒绝时必填）', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  audit_reason?: string;
}

