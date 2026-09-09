import {
  DEFAULT_FILTER,
  FilterSheet,
  useHydratedFilter,
  useSaveFilter,
} from '@features/discovery';
import { useDiscoveryFilterStore } from '@features/discovery/model/useDiscoveryFilterStore';
import { useDailyPicksStore } from '@features/daily-picks';
import { useParentProfile } from '@features/parent-profile';
import type { DiscoveryFilter } from '@shared/api/booting.types';
import { Screen, useToast } from '@shared/ui';
import { useRouter } from 'expo-router';

/**
 * 궁합 조건이 바뀌었는가.
 *
 * 바뀌었으면 오늘 뽑아 둔 여섯 장을 비워 다시 뽑는다 — '궁합 좋은 순'을
 * 골랐는데 내일 자정까지 어제 순서가 그대로면 정렬이 고장난 것으로 읽힌다.
 * 거리·나이 같은 조건은 그대로 둔다 (하루 여섯 장 제한이 조건을 계속 바꿔
 * 다시 뽑는 길로 새면 안 된다).
 */
function compatibilityChanged(before: DiscoveryFilter, after: DiscoveryFilter): boolean {
  return (
    (before.sort ?? 'recent') !== (after.sort ?? 'recent') ||
    (before.minCompatibility ?? null) !== (after.minCompatibility ?? null)
  );
}

export default function FiltersScreen() {
  const router = useRouter();
  const toast = useToast();
  const { filter } = useHydratedFilter();
  const saveFilter = useSaveFilter();
  const reset = useDiscoveryFilterStore((s) => s.reset);
  const clearPicks = useDailyPicksStore((s) => s.clear);
  const { data: profile } = useParentProfile();

  const apply = (next: DiscoveryFilter, onDone: () => void) => {
    const rerollNeeded = compatibilityChanged(filter, next);
    saveFilter.mutate(next, {
      onSuccess: () => {
        if (rerollNeeded) clearPicks();
        onDone();
      },
      onError: (error: Error) => toast.show({ message: error.message }),
    });
  };

  return (
    <Screen scroll>
      <FilterSheet
        initial={filter}
        sajuAvailable={!!profile?.saju}
        saving={saveFilter.isPending}
        onApply={(next) => apply(next, () => router.back())}
        onReset={() => {
          reset();
          apply(DEFAULT_FILTER, () => router.back());
        }}
      />
    </Screen>
  );
}
