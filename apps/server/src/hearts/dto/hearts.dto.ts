import { IsUUID } from 'class-validator';

import { DiscoveryItemDto } from '../../discovery/dto/discovery.dto';

export class SendHeartDto {
  @IsUUID()
  targetProfileId!: string;
}

export class PassDto {
  @IsUUID()
  targetProfileId!: string;
}

export interface SendHeartResponse {
  /** 상호 하트 여부. 서버가 판정한다 — 클라이언트는 결과만 받는다 */
  mutual: boolean;
  connectionId: string | null;
}

export interface ReceivedHeartDto {
  heartId: string;
  createdAt: string;
  read: boolean;
  profile: DiscoveryItemDto;
}
