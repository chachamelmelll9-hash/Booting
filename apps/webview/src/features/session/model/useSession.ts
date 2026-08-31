import { useEffect } from 'react';

import { useBridgeStore } from '../lib/bridge';
import { useSessionStore } from './useSessionStore';

export function useSession() {
  const store = useSessionStore();
  const { initializeTimeout, accessToken, isAuthenticated, isInitialized } = store;
  const isInWebView = useBridgeStore((s) => s.isInWebView);

  useEffect(() => {
    const cleanup = initializeTimeout(isInWebView);
    return cleanup;
  }, [initializeTimeout, isInWebView]);

  return {
    accessToken,
    isAuthenticated,
    isInitialized,
  };
}
