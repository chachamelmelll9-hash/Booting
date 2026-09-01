import { Injectable } from '@nestjs/common';

import { RegionsService } from '../regions/regions.service';
import { SupabaseService } from '../supabase/supabase.service';
import { DiscoveryFilterDto } from './dto/discovery.dto';

export interface CandidateQuery {
  userId: string;
  myProfileId: string;
  myRegionCode: string;
  /** 내 부모님 성별 — 동성 친구 규칙 판정에 쓴다 */
  myGender: 'male' | 'female';
  /** 내 부모님이 고른 관계 목적 */
  myGoals: string[];
  filter: DiscoveryFilterDto;
  cursor?: string;
  limit: number;
}

/**
 * 추천 후보 산출.
 *
 * 제외 집합은 **서버에서만** 계산한다 (차단 양방향 ∪ 넘김 ∪ 내가 보낸 하트 ∪
 * 비공개 ∪ 본인). 클라이언트가 걸러내는 구조면 응답에 이미 정보가 실려 나간 뒤다.
 */
@Injectable()
export class DiscoveryRepository {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly regions: RegionsService
  ) {}

  async findCandidates(q: CandidateQuery): Promise<Record<string, any>[]> {
    const client = this.supabase.getClient();

    const [heartsRes, passesRes, blocksOutRes, blocksInRes] = await Promise.all([
      client.from('hearts').select('target_parent_profile_id').eq('sender_user_id', q.userId),
      client.from('passes').select('target_parent_profile_id').eq('user_id', q.userId),
      client.from('blocks').select('blocked_user_id').eq('user_id', q.userId),
      client.from('blocks').select('user_id').eq('blocked_user_id', q.userId),
    ]);

    const excludedProfileIds = new Set<string>([q.myProfileId]);
    for (const r of heartsRes.data ?? []) excludedProfileIds.add(r.target_parent_profile_id);
    for (const r of passesRes.data ?? []) excludedProfileIds.add(r.target_parent_profile_id);

    const excludedUserIds = new Set<string>([q.userId]);
    for (const r of blocksOutRes.data ?? []) excludedUserIds.add(r.blocked_user_id);
    for (const r of blocksInRes.data ?? []) excludedUserIds.add(r.user_id);

    let query = client
      .from('parent_profiles')
      .select('*')
      .eq('status', 'published')
      .not('id', 'in', toInList(excludedProfileIds))
      .not('user_id', 'in', toInList(excludedUserIds))
      .order('last_active_at', { ascending: false })
      .limit(q.limit + 1);

    const f = q.filter;

    /**
     * 동성 친구 규칙.
     *
     * '동성 친구'는 이성 교제가 아니다. 그래서 이 목적을 고른 분에게 이성
     * 프로필을 보여주면 안 되고, 반대로 재혼·진지한 만남을 찾는 분에게
     * "동성 친구만" 찾는 분을 보여줘도 안 된다. 양쪽 다 서로에게 헛걸음이다.
     *
     * 규칙은 대칭이다:
     *   - 내 목적에 동성 친구가 있으면 → 같은 성별 + 상대도 동성 친구 목적
     *   - 없으면 → 목적이 '동성 친구' 하나뿐인 분은 제외
     * 성별 조건은 사용자 필터(targetGender)보다 우선한다 — 목적이 더 강한 신호다.
     */
    const wantsSameSexFriend = q.myGoals.includes('same_sex_friend');

    if (wantsSameSexFriend) {
      query = query.eq('gender', q.myGender);
      const sameSexSeekers = await this.profileIdsWithGoal('same_sex_friend');
      if (!sameSexSeekers.length) return [];
      query = query.in('id', sameSexSeekers);
    } else {
      const sameSexOnly = await this.profileIdsWithOnlyGoal('same_sex_friend');
      if (sameSexOnly.length) {
        query = query.not('id', 'in', `(${sameSexOnly.join(',')})`);
      }
      if (f.targetGender) query = query.eq('gender', f.targetGender);
    }
    if (f.maritalFilter) query = query.eq('marital_status', f.maritalFilter);
    if (f.religion) query = query.eq('religion', f.religion);
    if (f.drinking) query = query.eq('drinking', f.drinking);
    if (f.smoking) query = query.eq('smoking', f.smoking);
    if (f.economicallyActive !== undefined && f.economicallyActive !== null) {
      query = query.eq('economically_active', f.economicallyActive);
    }

    if (f.ageMin != null) query = query.lte('birth_date', birthDateForAge(f.ageMin));
    if (f.ageMax != null) query = query.gte('birth_date', oldestBirthDateForAge(f.ageMax));

    const originCode = f.regionCode || q.myRegionCode;
    const radius = f.radiusKm ?? 30;
    const codes = await this.regions.codesWithin(originCode, radius);
    if (codes) query = query.in('region_code', codes);

    if (f.goals?.length) {
      const { data } = await client
        .from('relationship_goals')
        .select('parent_profile_id')
        .in('goal', f.goals);
      const ids = [...new Set((data ?? []).map((r) => r.parent_profile_id))];
      if (!ids.length) return [];
      query = query.in('id', ids);
    }

    if (q.cursor) query = query.lt('last_active_at', q.cursor);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /** 해당 목적을 가진 프로필 id */
  private async profileIdsWithGoal(goal: string): Promise<string[]> {
    const { data } = await this.supabase
      .getClient()
      .from('relationship_goals')
      .select('parent_profile_id')
      .eq('goal', goal);
    return [...new Set((data ?? []).map((r) => r.parent_profile_id as string))];
  }

  /** 목적이 그것 **하나뿐인** 프로필 id (다른 목적을 함께 고른 사람은 제외되지 않는다) */
  private async profileIdsWithOnlyGoal(goal: string): Promise<string[]> {
    const client = this.supabase.getClient();
    const { data } = await client.from('relationship_goals').select('parent_profile_id, goal');

    const byProfile = new Map<string, string[]>();
    for (const row of data ?? []) {
      const list = byProfile.get(row.parent_profile_id) ?? [];
      list.push(row.goal);
      byProfile.set(row.parent_profile_id, list);
    }

    return [...byProfile.entries()]
      .filter(([, goals]) => goals.length === 1 && goals[0] === goal)
      .map(([profileId]) => profileId);
  }

  /** 여러 프로필의 관계 목적을 한 번에 (N+1 방지) */
  async goalsFor(profileIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    if (!profileIds.length) return result;

    const { data } = await this.supabase
      .getClient()
      .from('relationship_goals')
      .select('parent_profile_id, goal')
      .in('parent_profile_id', profileIds);

    for (const row of data ?? []) {
      const list = result.get(row.parent_profile_id) ?? [];
      list.push(row.goal);
      result.set(row.parent_profile_id, list);
    }
    return result;
  }

  /** 배지 계산에 쓰는 인증·동의·검수 상태를 한 번에 */
  async badgesFor(
    profiles: { id: string; user_id: string }[]
  ): Promise<Map<string, { child: boolean; family: boolean; consent: boolean; review: boolean }>> {
    const result = new Map<
      string,
      { child: boolean; family: boolean; consent: boolean; review: boolean }
    >();
    if (!profiles.length) return result;

    const client = this.supabase.getClient();
    const profileIds = profiles.map((p) => p.id);
    const userIds = profiles.map((p) => p.user_id);

    const [verifications, consents, reviews] = await Promise.all([
      client
        .from('child_verifications')
        .select('user_id, phone_verified_at, family_doc_status')
        .in('user_id', userIds),
      client
        .from('parent_consents')
        .select('parent_profile_id, consented_at, revoked_at')
        .in('parent_profile_id', profileIds)
        .is('revoked_at', null),
      client
        .from('profile_reviews')
        .select('parent_profile_id, status')
        .in('parent_profile_id', profileIds)
        .eq('status', 'approved'),
    ]);

    const byUser = new Map((verifications.data ?? []).map((v) => [v.user_id, v]));
    const consented = new Set(
      (consents.data ?? []).filter((c) => c.consented_at).map((c) => c.parent_profile_id)
    );
    const reviewed = new Set((reviews.data ?? []).map((r) => r.parent_profile_id));

    for (const p of profiles) {
      const v = byUser.get(p.user_id);
      result.set(p.id, {
        child: !!v?.phone_verified_at,
        family: v?.family_doc_status === 'approved',
        consent: consented.has(p.id),
        review: reviewed.has(p.id),
      });
    }
    return result;
  }
}

/** PostgREST `not.in` 은 빈 목록을 못 받는다 — 절대 매칭되지 않는 자리표시자를 넣는다 */
function toInList(ids: Set<string>): string {
  const list = [...ids];
  if (!list.length) return '(00000000-0000-0000-0000-000000000000)';
  return `(${list.join(',')})`;
}

/** 만 `age` 세가 되는 가장 늦은 생년월일 (이 날짜 이전에 태어났으면 age 세 이상) */
function birthDateForAge(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  return d.toISOString().slice(0, 10);
}

/** 만 `age` 세를 넘지 않는 가장 이른 생년월일 */
function oldestBirthDateForAge(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age - 1);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
