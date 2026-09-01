import {
  DEFAULT_FILTER,
  FilterSheet,
  useHydratedFilter,
  useSaveFilter,
} from '@features/discovery';
import { useDiscoveryFilterStore } from '@features/discovery/model/useDiscoveryFilterStore';
import { Screen, useToast } from '@shared/ui';
import { useRouter } from 'expo-router';

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
