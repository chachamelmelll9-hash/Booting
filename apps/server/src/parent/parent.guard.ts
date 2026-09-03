import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';

/**
 * 부모님 세션 가드.
 *
 * 부모님은 `auth.users` 에 없어 Supabase JWT 를 받을 수 없다. 자녀가 알려준
 * 코드로 로그인하면 서버가 불투명 토큰을 발급하고, 여기서 그 토큰을
 * `parent_sessions` 로 검증해 `req.parentProfileId` 를 채운다.
 *
 * 자녀용 `AuthGuard` 와 절대 섞지 않는다 — 부모님 토큰으로 자녀 API 에
 * 들어갈 수 있으면 남의 계정 전체가 열린다.
 */
@Injectable()
export class ParentGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      parentProfileId?: string;
    }>();

    const header = request.headers['authorization'] ?? request.headers['Authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException({ code: 'parent_token_missing' });

    const client = this.supabase.getClient();
    const { data } = await client
      .from('parent_sessions')
      .select('parent_profile_id')
      .eq('token', token)
      .maybeSingle();

    if (!data) throw new UnauthorizedException({ code: 'parent_token_invalid' });

    // 마지막 접속 시각만 갱신한다. 만료는 두지 않는다 — 부모님이 다시 코드를
    // 찾아 넣게 만드는 순간 이 서비스를 못 쓰는 이유가 하나 생긴다.
    await client
      .from('parent_sessions')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('token', token);

    request.parentProfileId = data.parent_profile_id as string;
    return true;
  }
}
