import { IsString, IsNotEmpty, IsIn, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AuditNoteDto {
  @ApiProperty({ enum: ['approved', 'rejected'], description: '审核结果' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['approved', 'rejected'])
  audit_status: 'approved' | 'rejected';

  @ApiProperty({ description: '审核原因（拒绝时必填）', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  audit_reason?: string;
}
