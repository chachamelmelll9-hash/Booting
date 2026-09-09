import { Injectable } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';
import type { FourPillars, SajuCompatibility } from './lib';
import { compatibility, computePillars } from './lib';

export interface ProfileSaju {
  pillars: FourPillars;
  /**
   * 원본 생년월일·출생시각을 **상대에게 보여도 되는가** (`saju_infos.is_public`).
   *
   * 궁합 계산 자체는 이 값과 무관하게 돌아간다. 사주 정보를 적었다는 것이 곧
   * 궁합을 보겠다는 뜻이고(PRD 5.3 이 사주 칸을 둔 이유가 그것이다), 점수와
   * 근거 코드만으로는 생년월일이 복원되지 않기 때문이다. 이 플래그는 상세
   * 화면에 **날짜 자체를 찍을지**만 가른다.
   */
  isPublic: boolean;
}

/**
 * 사주 조회·궁합 계산.
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

    const { data } = await this.supabase
      .getClient()
      .from('saju_infos')
      .select('parent_profile_id, birth_date, calendar_type, birth_time, birth_time_unknown, is_public')
      .in('parent_profile_id', profileIds);

    for (const row of data ?? []) {
      const pillars = computePillars({
        birthDate: row.birth_date,
        calendarType: row.calendar_type,
        // DB 는 'HH:mm:ss' 로 돌려준다 — 초는 시주에 영향이 없어 잘라 쓴다
        birthTime: row.birth_time ? String(row.birth_time).slice(0, 5) : null,
        birthTimeUnknown: row.birth_time_unknown,
      });
      // 날짜가 깨졌거나 음력 변환표 밖이면 그 프로필은 궁합에서 빠진다
      if (pillars) {
        result.set(row.parent_profile_id, { pillars, isPublic: row.is_public });
      }
    }
    return result;
  }

  async pillarsOf(profileId: string): Promise<ProfileSaju | null> {
    const map = await this.pillarsFor([profileId]);
    return map.get(profileId) ?? null;
  }

  /** 한쪽이라도 사주가 없으면 궁합도 없다 — 0점이 아니라 '없음'이다 */
  compare(mine: ProfileSaju | null, theirs: ProfileSaju | null): SajuCompatibility | null {
    if (!mine || !theirs) return null;
    return compatibility(mine.pillars, theirs.pillars);
  }
}
