import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { SupabaseService } from '../../supabase/supabase.service';
import { domainError, ERROR_CODES } from '../constants/errors';

/**
 * 자녀 본인인증(휴대폰)이 끝나야 통과한다.
 *
 * 프로필 작성·하트·대화 같은 "실체가 생기는" 쓰기 경로 앞에 둔다.
 * 인증 없이 프로필이 만들어지면 부모님 동의 동선 전체가 무의미해진다.
 *
 * 가족관계증명서는 더 이상 보지 않는다. 실제로 남의 부모님을 막는 장치는
 * **부모님 본인의 동의**다 — 부모님이 링크를 열고 직접 누르셔야 프로필이
 * 공개된다. 증명서는 그 위에 서류 한 장을 더 얹었을 뿐인데, 등록하려는 자녀
 * 모두에게 주민센터를 다녀오게 만들었다.
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
      .select('phone_verified_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data?.phone_verified_at) {
      throw new ForbiddenException(domainError(ERROR_CODES.CHILD_NOT_VERIFIED));
    }
    return true;
  }
}
