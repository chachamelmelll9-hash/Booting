import type { DiscoveryFilter } from '@shared/api/booting.types';
import { create } from 'zustand';

/** 반경 옵션. 0 = 전국 (TODO-06: 기본 30km) */
export const RADIUS_OPTIONS = [
  { km: 10, label: '10km' },
  { km: 30, label: '30km' },
  { km: 50, label: '50km' },
  { km: 0, label: '전국' },
] as const;

export const DEFAULT_FILTER: DiscoveryFilter = { radiusKm: 30, goals: [] };

interface FilterState {
  filter: DiscoveryFilter;
  /** 서버 값으로 한 번 맞춘 뒤에만 필터 시트를 신뢰할 수 있다 */
  hydrated: boolean;
  set: (patch: Partial<DiscoveryFilter>) => void;
  replace: (filter: DiscoveryFilter) => void;
  reset: () => void;
}

/**
 * 추천 필터.
 *
 * 홈 헤더의 요약 칩과 필터 시트가 **같은 값을 본다.** 화면마다 로컬 state 로
 * 들고 있으면 시트를 닫았을 때 헤더가 옛 조건을 계속 보여준다.
 *
 * 자녀 수·동거 가족은 여기에도 없다 — PRD 필터 금지 항목이고, 타입(DiscoveryFilter)
 * 에 자리가 없어서 실수로 추가되지 않는다.
 */
export const useDiscoveryFilterStore = create<FilterState>((set) => ({
  filter: DEFAULT_FILTER,
  hydrated: false,
  set: (patch) => set((state) => ({ filter: { ...state.filter, ...patch } })),
  replace: (filter) => set({ filter, hydrated: true }),
  reset: () => set({ filter: DEFAULT_FILTER }),
}));

export function radiusLabel(km: number): string {
  return RADIUS_OPTIONS.find((o) => o.km === km)?.label ?? `${km}km`;
}

/**
 * 현재 조건을 한 줄로. 추천이 비었을 때 **왜** 비었는지 보여주는 데 쓴다.
 *
 * "조건에 맞는 분이 없습니다"만 있으면 사용자는 앱이 고장난 줄 안다.
 * 실제로 이번에도 `남성 · 50~60세` 조건에 해당자가 없어서 빈 화면이 나왔는데,
 * 조건이 보이지 않으니 원인을 알 방법이 없었다.
 */
export function filterSummary(filter: DiscoveryFilter): string {
  const parts: string[] = [];

  parts.push(
    filter.targetGender === 'male'
      ? '남성'
      : filter.targetGender === 'female'
        ? '여성'
        : '성별 무관'
  );

  if (filter.ageMin != null || filter.ageMax != null) {
    parts.push(`${filter.ageMin ?? 50}~${filter.ageMax ?? 100}세`);
  }

  parts.push(radiusLabel(filter.radiusKm));

  if (filter.maritalFilter) {
    parts.push(filter.maritalFilter === 'bereaved' ? '사별' : '이혼');
  }
  if (filter.goals?.length) {
    parts.push(`관계 목적 ${filter.goals.length}개`);
  }

  return parts.join(' · ');
}
