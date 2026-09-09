import { Injectable } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';
import type { FourPillars, SajuCompatibility } from './lib';
import { compatibility, computePillars } from './lib';

export interface ProfileSaju {
  pillars: FourPillars;
  /**
   * 원본 생년월일·출생시각을 **상대에게 보여도 되는가** (`saju_infos.is_public`).
   *
   * 궁합 계산 자체는 이 값과 무관하게 돌아간다. 점수와 일주만으로는 생년월일이
   * 복원되지 않기 때문이다. 이 플래그는 상세 화면의 '사주 정보' 섹션에
   * **날짜 자체를 찍을지**만 가른다. 보정값을 적지 않은 분은 기본 비공개다.
   */
  isPublic: boolean;
}

/**
 * 사주 조회·궁합 계산.
 *
 * **모든 프로필에 사주가 있다.** 생년월일은 필수 항목이고(PRD 5.1), 사주팔자를
 * 세우는 데 더 필요한 것은 양·음력과 출생시각뿐인데 둘 다 기본값이 있다
 * (양력 / 시각 모름 → 시주를 빼고 세 기둥). 그래서 `saju_infos` 는 **없어도 되는
 * 보정값**이지 사주의 유무를 가르는 스위치가 아니다.
 *
 * 팔자는 저장하지 않고 매번 세운다. 순수 계산이라 한 건에 수십 마이크로초이고,
 * 캐시 컬럼을 두면 생년월일을 고쳤을 때 조용히 어긋나는 쪽이 더 비싸다.
 */
@Injectable()
export class SajuService {
  constructor(private readonly supabase: SupabaseService) {}

  /** 여러 프로필의 팔자를 한 번에 (카드 목록용 — N+1 방지) */
  async pillarsFor(profileIds: string[]): Promise<Map<string, ProfileSaju>> {
    const result = new Map<string, ProfileSaju>();
    if (!profileIds.length) return result;

    const client = this.supabase.getClient();
    const [sajuRes, profileRes] = await Promise.all([
      client
        .from('saju_infos')
        .select('parent_profile_id, birth_date, calendar_type, birth_time, birth_time_unknown, is_public')
        .in('parent_profile_id', profileIds),
      // 보정값이 없을 때 기준이 되는 필수 생년월일
      client.from('parent_profiles').select('id, birth_date').in('id', profileIds),
    ]);

    const refined = new Map(
      (sajuRes.data ?? []).map((row) => [row.parent_profile_id as string, row])
    );

    for (const profile of profileRes.data ?? []) {
      const row = refined.get(profile.id as string);
      const pillars = computePillars(
        row
          ? {
              birthDate: row.birth_date,
              calendarType: row.calendar_type,
              // DB 는 'HH:mm:ss' 로 돌려준다 — 초는 시주에 영향이 없어 잘라 쓴다
              birthTime: row.birth_time ? String(row.birth_time).slice(0, 5) : null,
              birthTimeUnknown: row.birth_time_unknown,
            }
          : // 보정값이 없으면 프로필 생년월일을 양력·시각 모름으로 본다
            {
              birthDate: profile.birth_date,
              calendarType: 'solar',
              birthTime: null,
              birthTimeUnknown: true,
            }
      );
      // 날짜가 깨졌거나 음력 변환표 밖일 때만 빠진다
      if (pillars) {
        result.set(profile.id as string, { pillars, isPublic: row?.is_public ?? false });
      }
    }
    return result;
  }

  async pillarsOf(profileId: string): Promise<ProfileSaju | null> {
    const map = await this.pillarsFor([profileId]);
    return map.get(profileId) ?? null;
  }

  /**
   * 한쪽이라도 팔자를 못 세우면 궁합도 없다 — 0점이 아니라 '없음'이다.
   *
   * 생년월일이 필수라 실제로는 거의 나지 않는다. 날짜가 깨졌거나 음력 변환표
   * (1391~2050) 밖일 때뿐이다.
   */
  compare(mine: ProfileSaju | null, theirs: ProfileSaju | null): SajuCompatibility | null {
    if (!mine || !theirs) return null;
    return compatibility(mine.pillars, theirs.pillars);
  }
}
