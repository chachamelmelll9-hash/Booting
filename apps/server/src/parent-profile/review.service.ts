import { Injectable, Logger } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getLatest(parentProfileId: string) {
    const { data } = await this.supabase
      .getClient()
      .from('profile_reviews')
      .select('*')
      .eq('parent_profile_id', parentProfileId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  }

  /**
   * 검수 접수 → (MVP) 자동 승인 → 공개.
   *
   * TODO-05: MVP 는 자동 승인이다. **실제 출시 전 반드시 사람 검수로 교체해야 한다.**
   * 상태 전이(pending → approved/rejected)와 profile.status 갱신을 여기 한 곳에만 두어,
   * 실심사를 붙일 때 이 메서드만 갈아끼우면 되게 했다.
   */
  async submitAndAutoApprove(parentProfileId: string): Promise<'approved' | 'rejected'> {
    const client = this.supabase.getClient();
    const now = new Date().toISOString();

    await client.from('parent_profiles').update({ status: 'review' }).eq('id', parentProfileId);

    const { data: review } = await client
      .from('profile_reviews')
      .insert({ parent_profile_id: parentProfileId, status: 'pending' })
      .select('id')
      .single();

    this.logger.log(`profile ${parentProfileId} auto-approved (MVP stub)`);

    await client
      .from('profile_reviews')
      .update({ status: 'approved', reviewed_at: now })
      .eq('id', review?.id);

    await client
      .from('parent_profiles')
      .update({ status: 'published', published_at: now, last_active_at: now })
      .eq('id', parentProfileId);

    return 'approved';
  }
}
