import { refreshApi } from '@features/auth/api';
import {
  clearAll,
  getRefreshToken,
  getTokens,
  getUser,
  saveTokens,
} from '@features/auth/lib/tokenStorage';
import { useAuthStore } from '@features/auth/model/useAuthStore';

jest.mock('@react-native-kakao/user', () => ({
  isLogined: jest.fn(async () => false),
  logout: jest.fn(async () => undefined),
}));

jest.mock('@shared/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: jest.fn(async () => ({ error: null })),
    },
  },
}));

jest.mock('@features/auth/api', () => ({
  refreshApi: jest.fn(),
}));

jest.mock('@features/auth/lib/tokenStorage', () => ({
  clearAll: jest.fn(async () => undefined),
  getRefreshToken: jest.fn(),
  getTokens: jest.fn(),
  getUser: jest.fn(),
  saveTokens: jest.fn(async () => undefined),
}));

const mockRefreshApi = refreshApi as jest.Mock;
const mockGetTokens = getTokens as jest.Mock;
const mockGetUser = getUser as jest.Mock;
const mockGetRefreshToken = getRefreshToken as jest.Mock;

const user = { id: 'user-1', email: 'user@example.com' };

const freshTokens = {
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour from now
};

const expiringTokens = {
  accessToken: 'stale-access',
  refreshToken: 'stale-refresh',
  expiresAt: Date.now() + 60 * 1000, // within the 5-minute refresh window
};

describe('useAuthStore.initialize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isInitialized: false,
    });
  });

  it('ends unauthenticated when nothing is stored', async () => {
    mockGetTokens.mockResolvedValue(null);
    mockGetUser.mockResolvedValue(null);

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.isInitialized).toBe(true);
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('authenticates without refreshing when tokens are still valid', async () => {
    mockGetTokens.mockResolvedValue(freshTokens);
    mockGetUser.mockResolvedValue(user);

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(user);
    expect(mockRefreshApi).not.toHaveBeenCalled();
  });

  it('refreshes near-expiry tokens and stays authenticated on success', async () => {
    mockGetTokens.mockResolvedValue(expiringTokens);
    mockGetUser.mockResolvedValue(user);
    mockGetRefreshToken.mockResolvedValue(expiringTokens.refreshToken);
    mockRefreshApi.mockResolvedValue({
      success: true,
      data: {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresAt: Date.now() + 60 * 60 * 1000,
      },
    });

    await useAuthStore.getState().initialize();

    expect(mockRefreshApi).toHaveBeenCalledWith(expiringTokens.refreshToken);
    expect(saveTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      })
    );
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.isInitialized).toBe(true);
  });

  it('logs out when refreshing near-expiry tokens fails', async () => {
    mockGetTokens.mockResolvedValue(expiringTokens);
    mockGetUser.mockResolvedValue(user);
    mockGetRefreshToken.mockResolvedValue(expiringTokens.refreshToken);
    mockRefreshApi.mockResolvedValue({
      success: false,
      error: { code: 'token_revoked', message: 'revoked' },
    });

    await useAuthStore.getState().initialize();

    expect(clearAll).toHaveBeenCalled();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.isInitialized).toBe(true);
  });

  it('logs out when no refresh token is available for near-expiry tokens', async () => {
    mockGetTokens.mockResolvedValue(expiringTokens);
    mockGetUser.mockResolvedValue(user);
    mockGetRefreshToken.mockResolvedValue(null);

    await useAuthStore.getState().initialize();

    expect(mockRefreshApi).not.toHaveBeenCalled();
    expect(clearAll).toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('useAuthStore.clearAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears local auth state and storage', async () => {
    useAuthStore.setState({
      user,
      isAuthenticated: true,
      isInitialized: true,
    });

    await useAuthStore.getState().clearAuth();

    expect(clearAll).toHaveBeenCalled();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
