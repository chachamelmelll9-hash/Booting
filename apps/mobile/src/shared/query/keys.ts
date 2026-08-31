/**
 * Query Key Factory
 * Centralized query key management for TanStack Query
 */

export const queryKeys = {
  devices: {
    all: ['devices'] as const,
    list: () => [...queryKeys.devices.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.devices.all, 'detail', id] as const,
    byUid: (uid: string) => [...queryKeys.devices.all, 'byUid', uid] as const,
  },
};
