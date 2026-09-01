import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { SupabaseService } from '../../supabase/supabase.service';
import { domainError, ERROR_CODES } from '../constants/errors';

/**
 * 자녀 인증(본인인증 + 가족관계 확인)이 끝나야 통과한다.
 *
 * 프로필 작성·하트·대화 같은 "실체가 생기는" 쓰기 경로 앞에 둔다.
 * 인증 없이 프로필이 만들어지면 부모님 동의 동선 전체가 무의미해진다.
 */
@Injectable()
export class VerifiedChildGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id as string | undefined;
    if (!userId) throw new ForbiddenException(domainError(ERROR_CODES.FORBIDDEN));

    const { data } = await this.supabase
      .getClient()
      .from('child_verifications')
      .select('phone_verified_at, family_doc_status')
      .eq('user_id', userId)
      .maybeSingle();

    const verified =
      !!data?.phone_verified_at && data?.family_doc_status === 'approved';

    if (!verified) {
      throw new ForbiddenException(domainError(ERROR_CODES.CHILD_NOT_VERIFIED));
    }
    return true;
  }
}
