import { useEffect, useRef } from 'react';

import { useAuthStore } from './useAuthStore';

export function useAuth() {
  const store = useAuthStore();
  const initializingRef = useRef(false);

  // 앱 시작 시 한 번만 초기화
  useEffect(() => {
    if (!store.isInitialized && !initializingRef.current) {
      initializingRef.current = true;
      store.initialize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.isInitialized, store.initialize]);

  return store;
}
