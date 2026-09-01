import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { SupabaseService } from '../../supabase/supabase.service';
import { domainError, ERROR_CODES } from '../constants/errors';

/**
 * 내 부모님 프로필이 공개(published) 상태여야 통과한다.
 *
 * 추천 피드·하트는 상호주의다 — 내 프로필을 내놓지 않고 남의 프로필만 보는
 * 경로를 막는다. request.parentProfileId 에 프로필 id 를 실어 컨트롤러가 재조회하지 않게 한다.
 */
@Injectable()
export class PublishedProfileGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id as string | undefined;
    if (!userId) throw new ForbiddenException(domainError(ERROR_CODES.FORBIDDEN));

    const { data } = await this.supabase
      .getClient()
      .from('parent_profiles')
      .select('id, status')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data || data.status !== 'published') {
      throw new ForbiddenException(
        domainError(ERROR_CODES.PROFILE_NOT_PUBLISHED)
      );
    }

    request.parentProfileId = data.id;
    return true;
  }
}
