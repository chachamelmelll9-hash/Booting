import { NotificationKind } from '../../common/types';

export interface NotificationDto {
  id: string;
  type: NotificationKind;
  connectionId: string | null;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}
