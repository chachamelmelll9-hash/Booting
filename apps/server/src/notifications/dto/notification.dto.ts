import { NotificationKind } from '../../common/types';

export interface NotificationDto {
  id: string;
  type: NotificationKind;
  connectionId: string | null;
  /** 알림 상대의 별명. 상대가 없는 알림(프로필 검수 등)은 null */
  nickname: string | null;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}
