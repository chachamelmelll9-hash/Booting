import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const REPORT_REASONS = [
  'fake_profile',
  'inappropriate_photo',
  'abusive_language',
  'commercial',
  'meeting_no_show',
  'safety_concern',
  'other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export class CreateReportDto {
  @IsUUID()
  targetProfileId!: string;

  @Type(() => String)
  @IsIn(REPORT_REASONS)
  reason!: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  detail?: string;
}

export class CreateBlockDto {
  @IsUUID()
  targetProfileId!: string;
}

export interface ReportDto {
  id: string;
  reason: ReportReason;
  detail: string | null;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  createdAt: string;
  /** 신고 대상의 마스킹된 이름. 신고 이력 화면에서 누구였는지만 알면 된다 */
  targetMaskedName: string;
}

export interface BlockDto {
  id: string;
  maskedName: string;
  createdAt: string;
}
