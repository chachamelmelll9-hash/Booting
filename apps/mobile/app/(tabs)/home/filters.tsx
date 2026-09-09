import {
  DEFAULT_FILTER,
  FilterSheet,
  useHydratedFilter,
  useSaveFilter,
} from '@features/discovery';
import { useDiscoveryFilterStore } from '@features/discovery/model/useDiscoveryFilterStore';
import { Screen, useToast } from '@shared/ui';
import { useRouter } from 'expo-router';

/**
 * 추천 조건.
 *
 * 여기에 **정렬 항목이 없다.** 조건에 맞는 분들 안에서 누구를 먼저 보여줄지는
 * 서버가 정한다 — 우리 부모님 사주가 있으면 궁합이 높은 순이다 (PRD 8.4).
 */
export default function FiltersScreen() {
  const router = useRouter();
  const toast = useToast();
  const { filter } = useHydratedFilter();
  const saveFilter = useSaveFilter();
  const reset = useDiscoveryFilterStore((s) => s.reset);

  return (
    <Screen scroll>
      <FilterSheet
        initial={filter}
        saving={saveFilter.isPending}
        onApply={(next) =>
          saveFilter.mutate(next, {
            onSuccess: () => router.back(),
            onError: (error: Error) => toast.show({ message: error.message }),
          })
        }
        onReset={() => {
          reset();
          saveFilter.mutate(DEFAULT_FILTER, { onSuccess: () => router.back() });
        }}
      />
    </Screen>
  );
}
