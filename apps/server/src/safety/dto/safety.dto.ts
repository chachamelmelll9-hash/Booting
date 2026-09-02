import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const REPORT_REASONS = [
  'money_request',
  'inappropriate_behavior',
  'scam_suspicion',
  'fake_profile',
  'inappropriate_photo',
  'commercial',
  'meeting_no_show',
  'other',
  // 아래 둘은 앱에서 더 이상 고를 수 없다. 스토어에 나간 구버전이 아직 보내고,
  // reports 행에도 남아 있으므로 계속 받아준다.
  'safety_concern',
  'abusive_language',
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
  /** 신고 대상의 별명. 신고 이력 화면에서 누구였는지만 알면 된다 */
  targetNickname: string;
}

export interface BlockDto {
  id: string;
  nickname: string;
  createdAt: string;
}
