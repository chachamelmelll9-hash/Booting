import { useEffect } from 'react';

import { useBridgeStore } from './bridge';

export function useBridge() {
  const store = useBridgeStore();
  const { initializeListener, sendToMobile, isInWebView } = store;

  useEffect(() => {
    const cleanup = initializeListener();
    return cleanup;
  }, [initializeListener]);

  return {
    sendToMobile,
    isInWebView,
  };
}
