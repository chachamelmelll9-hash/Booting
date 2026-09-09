import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { domainError, ERROR_CODES } from '../common/constants/errors';
import { Page } from '../common/dto/pagination.dto';
import { calcAge, excerpt, maskName } from '../common/privacy';
import { DEFAULT_RADIUS_KM, RelationshipGoal } from '../common/types';
import { PhotosService } from '../parent-profile/photos.service';
import { RegionsService } from '../regions/regions.service';
import { SajuService } from '../saju/saju.service';
import { SupabaseService } from '../supabase/supabase.service';
import { DiscoveryRepository } from './discovery.repository';
import {
  DiscoveryFilterDto,
  DiscoveryItemDto,
  PublicProfileDto,
} from './dto/discovery.dto';

/**
 * 궁합으로 정렬·거를 때 한 번에 훑는 후보 수.
 *
 * 궁합은 DB 가 모르는 값이라 SQL 로 정렬할 수 없다 — 후보를 받아 와서 서버가
 * 매긴다. 그래서 상한이 필요하다. 홈은 하루 여섯 장을 보여주므로 최근 활동
 * 순 200명이면 충분히 깊고, 이보다 늘리면 매 요청의 계산량만 커진다.
 */
const COMPATIBILITY_POOL = 200;

/** 궁합 정렬의 커서는 타임스탬프가 아니라 **정렬된 목록에서의 위치**다 */
const OFFSET_CURSOR_PREFIX = 'o:';

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly repository: DiscoveryRepository,
    private readonly photos: PhotosService,
    private readonly regions: RegionsService,
    private readonly saju: SajuService
  ) {}

  // --- 필터 -------------------------------------------------------------------

  async getFilter(userId: string): Promise<DiscoveryFilterDto & { radiusKm: number }> {
    const { data } = await this.supabase
      .getClient()
      .from('discovery_filters')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data) {
      // 저장된 조건이 없으면 **이성**을 기본으로 잡는다.
      // 성별 무관으로 두면 재혼·진지한 만남을 찾는 분에게 동성 프로필이 섞여
      // 첫 화면부터 정리가 안 된 인상을 준다. 동성 친구 목적인 경우에는
      // 추천 단계에서 이 값이 무시되므로(같은 성별 강제) 충돌하지 않는다.
      const { data: me } = await this.supabase
        .getClient()
        .from('parent_profiles')
        .select('gender')
        .eq('user_id', userId)
        .maybeSingle();

      return {
        targetGender: me?.gender === 'male' ? 'female' : me?.gender === 'female' ? 'male' : undefined,
        radiusKm: DEFAULT_RADIUS_KM,
        goals: [],
        sort: 'recent',
      };
    }

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
      sort: data.sort ?? 'recent',
      minCompatibility: data.min_compatibility ?? undefined,
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
          sort: dto.sort ?? 'recent',
          min_compatibility: dto.minCompatibility ?? null,
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
    const mySaju = await this.saju.pillarsOf(myProfileId);

    /**
     * 궁합은 우리 부모님 사주가 있어야 낼 수 있다.
     *
     * 없는데도 저장된 조건을 그대로 적용하면 홈이 통째로 빈다 — 사주를 안 적은
     * 것이 사람을 못 보는 이유가 되면 안 된다. 그래서 조용히 최근 활동 순으로
     * 돌아가고, 화면은 "사주를 적으면 궁합순으로 볼 수 있다"고 안내한다.
     */
    const scored =
      !!mySaju && (filter.sort === 'compatibility' || filter.minCompatibility != null);

    const base = {
      userId,
      myProfileId,
      myRegionCode: me?.region_code ?? '',
      myGender: (me?.gender as 'male' | 'female') ?? 'male',
      myGoals: myGoalsMap.get(myProfileId) ?? [],
      filter,
    };

    if (!scored) {
      // 정렬을 바꾸면 커서 뜻도 바뀐다 — 옛 커서를 그대로 쓰면 타임스탬프
      // 자리에 위치 값이 들어가 쿼리가 깨진다. 첫 페이지로 되돌린다.
      const timeCursor = cursor?.startsWith(OFFSET_CURSOR_PREFIX) ? undefined : cursor;
      const rows = await this.repository.findCandidates({ ...base, cursor: timeCursor, limit });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;

      return {
        items: await this.toItems(page, me?.region_code ?? '', myProfileId),
        nextCursor: hasMore && page.length ? page[page.length - 1].last_active_at : null,
      };
    }

    // 궁합을 쓰는 경로 — 후보를 한 번에 받아 서버가 매기고 자른다
    const pool = await this.repository.findCandidates({
      ...base,
      cursor: undefined,
      limit: COMPATIBILITY_POOL,
    });
    const sajus = await this.saju.pillarsFor(pool.map((r) => r.id));

    const ranked = pool
      .map((row) => ({ row, score: this.saju.compare(mySaju, sajus.get(row.id) ?? null)?.score }))
      // 사주를 안 적은 분은 점수가 없다 — 최소 궁합을 걸면 그분들도 함께 빠진다
      .filter((c) => filter.minCompatibility == null || (c.score ?? -1) >= filter.minCompatibility);

    // 최소 궁합만 걸고 정렬은 그대로 두는 경우가 있어, 정렬은 조건부다
    if (filter.sort === 'compatibility') {
      ranked.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    }

    const offset = parseOffsetCursor(cursor);
    const page = ranked.slice(offset, offset + limit).map((c) => c.row);
    const nextOffset = offset + page.length;

    return {
      items: await this.toItems(page, me?.region_code ?? '', myProfileId),
      nextCursor:
        nextOffset < ranked.length ? `${OFFSET_CURSOR_PREFIX}${nextOffset}` : null,
    };
  }

  /**
   * 프로필 행 → 카드용 DTO. hearts·connections 도 같은 요약을 쓰기 때문에 공개한다 —
   * 마스킹·배지 계산이 두 벌이 되면 한쪽만 실명을 흘리는 사고가 난다.
   */
  async toItems(
    rows: Record<string, any>[],
    originRegionCode: string,
    /**
     * 보는 사람의 부모님 프로필 id. 주면 카드마다 궁합이 함께 실린다.
     *
     * 인연 관리·부모님 화면에서는 주지 않는다 — 궁합은 "관심을 보낼까"를 정할
     * 때 쓰는 정보이고, 이미 이어진 뒤에는 점수가 판단을 바꾸지 않는다.
     */
    viewerProfileId?: string
  ): Promise<DiscoveryItemDto[]> {
    if (!rows.length) return [];

    const ids = rows.map((r) => r.id);
    const [goals, badges, photoUrls, viewerSaju, sajus] = await Promise.all([
      this.repository.goalsFor(ids),
      this.repository.badgesFor(rows.map((r) => ({ id: r.id, user_id: r.user_id }))),
      this.photos.primaryUrls(ids),
      viewerProfileId ? this.saju.pillarsOf(viewerProfileId) : Promise.resolve(null),
      viewerProfileId ? this.saju.pillarsFor(ids) : Promise.resolve(null),
    ]);

    return Promise.all(
      rows.map(async (r) => ({
        profileId: r.id,
        // 실명은 여기서 끝난다 — DTO 에 원본이 들어가지 않는다.
        // 별명이 없는 옛 데이터만 마스킹으로 폴백한다.
        nickname: r.nickname || maskName(r.display_name),
        age: calcAge(r.birth_date),
        region: await this.regions.label(r.region_code),
        distanceKm: originRegionCode
          ? await this.regions.distanceKm(originRegionCode, r.region_code)
          : null,
        maritalStatus: r.marital_status,
        goals: (goals.get(r.id) ?? []) as RelationshipGoal[],
        primaryPhotoUrl: photoUrls.get(r.id) ?? '',
        introExcerpt: excerpt(r.intro_by_child),
        badges: badges.get(r.id) ?? { consent: false, review: false },
        compatibility: this.saju.compare(viewerSaju, sajus?.get(r.id) ?? null),
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

    // 여기서는 toItems 에 viewerProfileId 를 주지 않는다 — 궁합에 쓸 사주를
    // 아래에서 어차피 읽으므로, 넘기면 같은 조회가 두 번 돈다
    const [base] = await this.toItems([row], await this.myRegionCode(myProfileId));

    const [photoRows, sajuRes, heartRes, mySaju, theirSaju] = await Promise.all([
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
      this.saju.pillarsOf(myProfileId),
      this.saju.pillarsOf(profileId),
    ]);

    const photos = await this.photos.toDtos(photoRows.data ?? []);
    const compatibility = this.saju.compare(mySaju, theirSaju);

    return {
      ...base,
      compatibility,
      photoUrls: photos.map((p) => p.url),
      maritalSince: row.marital_since,
      heightCm: row.height_cm,
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
      // 궁합이 없으면 기둥도 보내지 않는다 — 내 기둥만 덩그러니 나오면
      // 이 화면에서 아무 의미가 없다
      sajuPillars: compatibility && mySaju
        ? {
            mine: mySaju.pillars,
            // 상대가 사주를 공개했을 때만. 기둥 넷은 생년월일에 가깝다
            theirs: theirSaju?.isPublic ? theirSaju.pillars : null,
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

/** `o:20` → 20. 정렬을 바꿔 커서 모양이 안 맞으면 처음부터 본다 */
function parseOffsetCursor(cursor?: string): number {
  if (!cursor?.startsWith(OFFSET_CURSOR_PREFIX)) return 0;
  const offset = Number(cursor.slice(OFFSET_CURSOR_PREFIX.length));
  return Number.isInteger(offset) && offset >= 0 ? offset : 0;
}
