import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { domainError, ERROR_CODES } from '../common/constants/errors';
import { Page } from '../common/dto/pagination.dto';
import { calcAge, excerpt, maskName } from '../common/privacy';
import { DEFAULT_RADIUS_KM, RelationshipGoal } from '../common/types';
import { PhotosService } from '../parent-profile/photos.service';
import { RegionsService } from '../regions/regions.service';
import { SupabaseService } from '../supabase/supabase.service';
import { DiscoveryRepository } from './discovery.repository';
import {
  DiscoveryFilterDto,
  DiscoveryItemDto,
  PublicProfileDto,
} from './dto/discovery.dto';

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly repository: DiscoveryRepository,
    private readonly photos: PhotosService,
    private readonly regions: RegionsService
  ) {}

  // --- 필터 -------------------------------------------------------------------

  async getFilter(userId: string): Promise<DiscoveryFilterDto & { radiusKm: number }> {
    const { data } = await this.supabase
      .getClient()
      .from('discovery_filters')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data) return { radiusKm: DEFAULT_RADIUS_KM, goals: [] };

    return {
      targetGender: data.target_gender ?? undefined,
      ageMin: data.age_min ?? undefined,
      ageMax: data.age_max ?? undefined,
      regionCode: data.region_code ?? undefined,
      radiusKm: data.radius_km ?? DEFAULT_RADIUS_KM,
      maritalFilter: data.marital_filter ?? undefined,
      goals: data.goals ?? [],
      religion: data.religion ?? undefined,
      drinking: data.drinking ?? undefined,
      smoking: data.smoking ?? undefined,
      economicallyActive: data.economically_active ?? undefined,
    };
  }

  async saveFilter(userId: string, dto: DiscoveryFilterDto) {
    const { error } = await this.supabase
      .getClient()
      .from('discovery_filters')
      .upsert(
        {
          user_id: userId,
          target_gender: dto.targetGender ?? null,
          age_min: dto.ageMin ?? null,
          age_max: dto.ageMax ?? null,
          region_code: dto.regionCode ?? null,
          radius_km: dto.radiusKm ?? DEFAULT_RADIUS_KM,
          marital_filter: dto.maritalFilter ?? null,
          goals: dto.goals ?? [],
          religion: dto.religion ?? null,
          drinking: dto.drinking ?? null,
          smoking: dto.smoking ?? null,
          economically_active: dto.economicallyActive ?? null,
        },
        { onConflict: 'user_id' }
      );
    if (error) throw new Error(error.message);
    return this.getFilter(userId);
  }

  // --- 추천 -------------------------------------------------------------------

  async recommend(
    userId: string,
    myProfileId: string,
    cursor?: string,
    limit = 10
  ): Promise<Page<DiscoveryItemDto>> {
    const { data: me } = await this.supabase
      .getClient()
      .from('parent_profiles')
      .select('region_code, gender')
      .eq('id', myProfileId)
      .single();

    // 내 부모님이 고른 목적은 추천 규칙의 입력이다 (동성 친구 등)
    const myGoalsMap = await this.repository.goalsFor([myProfileId]);

    const filter = await this.getFilter(userId);
    const rows = await this.repository.findCandidates({
      userId,
      myProfileId,
      myRegionCode: me?.region_code ?? '',
      myGender: (me?.gender as 'male' | 'female') ?? 'male',
      myGoals: myGoalsMap.get(myProfileId) ?? [],
      filter,
      cursor,
      limit,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const items = await this.toItems(page, me?.region_code ?? '');

    return {
      items,
      nextCursor: hasMore && page.length ? page[page.length - 1].last_active_at : null,
    };
  }

  /**
   * 프로필 행 → 카드용 DTO. hearts·connections 도 같은 요약을 쓰기 때문에 공개한다 —
   * 마스킹·배지 계산이 두 벌이 되면 한쪽만 실명을 흘리는 사고가 난다.
   */
  async toItems(
    rows: Record<string, any>[],
    originRegionCode: string
  ): Promise<DiscoveryItemDto[]> {
    if (!rows.length) return [];

    const ids = rows.map((r) => r.id);
    const [goals, badges, photoUrls] = await Promise.all([
      this.repository.goalsFor(ids),
      this.repository.badgesFor(rows.map((r) => ({ id: r.id, user_id: r.user_id }))),
      this.photos.primaryUrls(ids),
    ]);

    return Promise.all(
      rows.map(async (r) => ({
        profileId: r.id,
        // 실명은 여기서 끝난다 — DTO 에 원본이 들어가지 않는다
        maskedName: maskName(r.display_name),
        age: calcAge(r.birth_date),
        region: await this.regions.label(r.region_code),
        distanceKm: originRegionCode
          ? await this.regions.distanceKm(originRegionCode, r.region_code)
          : null,
        maritalStatus: r.marital_status,
        goals: (goals.get(r.id) ?? []) as RelationshipGoal[],
        primaryPhotoUrl: photoUrls.get(r.id) ?? '',
        introExcerpt: excerpt(r.intro_by_child),
        badges: badges.get(r.id) ?? {
          child: false,
          family: false,
          consent: false,
          review: false,
        },
      }))
    );
  }

  // --- 상세 -------------------------------------------------------------------

  async getPublicProfile(
    userId: string,
    myProfileId: string,
    profileId: string
  ): Promise<PublicProfileDto> {
    const client = this.supabase.getClient();

    const { data: row } = await client
      .from('parent_profiles')
      .select('*')
      .eq('id', profileId)
      .eq('status', 'published') // 비공개 프로필은 id 를 알아도 열리지 않는다
      .maybeSingle();

    if (!row) throw new NotFoundException(domainError(ERROR_CODES.PROFILE_NOT_FOUND));

    // 차단은 양방향으로 막는다
    const { data: block } = await client
      .from('blocks')
      .select('id')
      .or(
        `and(user_id.eq.${userId},blocked_user_id.eq.${row.user_id}),and(user_id.eq.${row.user_id},blocked_user_id.eq.${userId})`
      )
      .maybeSingle();
    if (block) throw new ForbiddenException(domainError(ERROR_CODES.BLOCKED));

    const [base] = await this.toItems([row], await this.myRegionCode(myProfileId));

    const [photoRows, sajuRes, heartRes] = await Promise.all([
      client
        .from('parent_photos')
        .select('*')
        .eq('parent_profile_id', profileId)
        .order('sort_order', { ascending: true }),
      client
        .from('saju_infos')
        .select('*')
        .eq('parent_profile_id', profileId)
        .eq('is_public', true) // 비공개 사주는 아예 읽지 않는다
        .maybeSingle(),
      client
        .from('hearts')
        .select('id')
        .eq('sender_user_id', userId)
        .eq('target_parent_profile_id', profileId)
        .maybeSingle(),
    ]);

    const photos = await this.photos.toDtos(photoRows.data ?? []);

    return {
      ...base,
      photoUrls: photos.map((p) => p.url),
      maritalSince: row.marital_since,
      introByChild: row.intro_by_child ?? '',
      desiredPartner: row.desired_partner ?? '',
      parentMessage: row.parent_message ?? '',
      motto: row.motto,
      religion: row.religion,
      occupation: row.occupation,
      retiredOccupation: row.retired_occupation,
      economicallyActive: row.economically_active,
      drinking: row.drinking,
      smoking: row.smoking,
      hobbies: row.hobbies ?? [],
      childrenCount: row.children_count,
      livingWith: row.living_with,
      saju: sajuRes.data
        ? {
            birthDate: sajuRes.data.birth_date,
            calendarType: sajuRes.data.calendar_type,
            birthTime: sajuRes.data.birth_time,
            birthTimeUnknown: sajuRes.data.birth_time_unknown,
          }
        : null,
      heartSent: !!heartRes.data,
    };
    // 실제 성명·생년월일·연락처·정확한 주소·family_doc_path 는 어느 필드에도 없다.
    // test-scenarios.md SEC.1~SEC.3 이 이 부재를 계약 수준에서 검증한다.
  }

  private async myRegionCode(myProfileId: string): Promise<string> {
    const { data } = await this.supabase
      .getClient()
      .from('parent_profiles')
      .select('region_code')
      .eq('id', myProfileId)
      .maybeSingle();
    return data?.region_code ?? '';
  }
}
