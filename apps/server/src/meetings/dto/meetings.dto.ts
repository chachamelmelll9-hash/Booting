import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import type {
  ConnectionStatus,
  MeetingFeedbackKind,
  MeetingStatus,
  ParentIntentKind,
} from '../../common/types';

export class ParentIntentDto {
  @Type(() => String)
  @IsIn(['willing', 'thinking', 'declined'])
  intent!: ParentIntentKind;
}

export class ProposeMeetingDto {
  @IsDateString()
  meetAt!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  place!: string;

  @IsBoolean()
  childAccompanied!: boolean;

  /** 자녀가 동행하지 않을 때만. PRD 는 동행을 강력 권장하고, 미동행이면 사유를 남긴다 */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  soloReason?: string;

  /** 미동행 시 안전수칙 확인 여부 (TODO-14) */
  @IsOptional()
  @IsBoolean()
  safetyAck?: boolean;
}

export class MeetingFeedbackDto {
  @Type(() => String)
  @IsIn(['continue', 'friends', 'thinking', 'no_more'])
  response!: MeetingFeedbackKind;
}

export interface MeetingDto {
  id: string;
  meetAt: string;
  place: string;
  childAccompanied: boolean;
  soloReason: string | null;
  status: MeetingStatus;
  proposedByMe: boolean;
  /** 내가 확인했는가 */
  confirmedByMe: boolean;
  /** 상대가 확인했는가 — 화면은 이것으로 "상대 확인 대기" 문구를 고른다 */
  confirmedByPartner: boolean;
  /** 만남 시각이 지나 확인 버튼을 열 수 있는가 */
  confirmable: boolean;
  /** 내 사후 응답 — 상대 것은 어떤 경우에도 내려가지 않는다 (PRD 12.3) */
  myFeedback: MeetingFeedbackKind | null;
  createdAt: string;
}

export interface ConfirmMeetingResponse {
  meeting: MeetingDto;
  /** 서버가 판정한 값. 모바일에 matched 로 바꾸는 경로는 없다 */
  connectionStatus: ConnectionStatus;
}
