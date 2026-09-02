import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { ConnectionStatus, ParentIntentKind } from '../../common/types';
import { DiscoveryItemDto } from '../../discovery/dto/discovery.dto';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;
}

export class EndConnectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export interface MessageDto {
  id: string;
  body: string;
  sentAt: string;
  mine: boolean;
  read: boolean;
  /** system 은 앱이 남긴 기록 — 말풍선이 아니라 가운데 한 줄로 렌더한다 */
  kind: 'text' | 'system';
}

export interface ConnectionDto {
  id: string;
  /**
   * PRD 10.3 상태값. 표시 문구는 모바일 `shared/config/connectionStatus.ts` 가
   * 유일한 소스다 — 서버는 코드값만 내려보낸다.
   */
  status: ConnectionStatus;
  partner: DiscoveryItemDto;
  lastMessage: { body: string; sentAt: string; mine: boolean } | null;
  unreadCount: number;
  /** 아직 확인하지 않은 대화방 — 안 읽은 메시지가 있거나 한 번도 열지 않았다 */
  unseen: boolean;
  /** 이 프로필을 내 부모님께 공유했는가 (매칭 목록의 공유 완료 표시) */
  sharedWithParent: boolean;
  /** 90일 경과 대화는 읽기 전용 (TODO-12) */
  readOnly: boolean;
  myParentIntent: ParentIntentKind | null;
  partnerRespondedIntent: boolean;
  meetingId: string | null;
  endedReason: string | null;
  createdAt: string;
  updatedAt: string;
}
