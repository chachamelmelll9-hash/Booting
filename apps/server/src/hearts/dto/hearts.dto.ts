import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

import { DiscoveryItemDto } from '../../discovery/dto/discovery.dto';

export class SendHeartDto {
  @IsUUID()
  targetProfileId!: string;

  /**
   * 함께 보낼 인사말 (선택).
   * 상호 하트가 되면 대화방 첫 메시지로 옮겨간다.
   */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  message?: string;
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
  /** 함께 온 인사말. 받는 쪽이 답할지 판단하는 근거가 된다 */
  message: string | null;
  profile: DiscoveryItemDto;
}
