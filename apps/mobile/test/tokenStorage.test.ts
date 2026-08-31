import {
  clearAll,
  clearTokens,
  clearUser,
  getAccessToken,
  getRefreshToken,
  getTokens,
  getUser,
  saveTokens,
  saveUser,
  type StoredTokens,
  type StoredUser,
} from '@features/auth/lib/tokenStorage';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

const secureStoreState = (SecureStore as unknown as { __store: Map<string, string> })
  .__store;

const tokens: StoredTokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresAt: 1_700_000_000_000,
};

const user: StoredUser = {
  id: 'user-1',
  email: 'user@example.com',
};

describe('tokenStorage', () => {
  beforeEach(() => {
    secureStoreState.clear();
    jest.clearAllMocks();
  });

  it('saves and reads tokens as a round trip', async () => {
    await saveTokens(tokens);

    expect(await getTokens()).toEqual(tokens);
    expect(await getAccessToken()).toBe('access-token');
    expect(await getRefreshToken()).toBe('refresh-token');
  });

  it('returns null when no tokens are stored', async () => {
    expect(await getTokens()).toBeNull();
    expect(await getAccessToken()).toBeNull();
    expect(await getRefreshToken()).toBeNull();
  });

  it('returns null for corrupt token JSON instead of throwing', async () => {
    secureStoreState.set('auth_tokens', 'not-json{');

    expect(await getTokens()).toBeNull();
  });

  it('clears tokens', async () => {
    await saveTokens(tokens);
    await clearTokens();

    expect(await getTokens()).toBeNull();
  });

  it('saves, reads and clears the user', async () => {
    await saveUser(user);
    expect(await getUser()).toEqual(user);

    await clearUser();
    expect(await getUser()).toBeNull();
  });

  it('clearAll removes both tokens and user', async () => {
    await saveTokens(tokens);
    await saveUser(user);

    await clearAll();

    expect(await getTokens()).toBeNull();
    expect(await getUser()).toBeNull();
  });

  it('swallows SecureStore delete errors', async () => {
    (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValueOnce(
      new Error('keychain unavailable')
    );

    await expect(clearTokens()).resolves.toBeUndefined();
  });
});
