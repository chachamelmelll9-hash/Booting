import { refreshApi } from '@/features/auth/api';
import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from '@/features/auth/lib/tokenStorage';
import { AuthenticationError, serverFetch } from '@/shared/api/server';

jest.mock('@/features/auth/api', () => ({
  refreshApi: jest.fn(),
}));

jest.mock('@/features/auth/lib/tokenStorage', () => ({
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  saveTokens: jest.fn(async () => undefined),
}));

const mockClearAuth = jest.fn(async () => undefined);

jest.mock('@/features/auth/model/useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({ clearAuth: mockClearAuth }),
  },
}));

const mockRefreshApi = refreshApi as jest.Mock;
const mockGetAccessToken = getAccessToken as jest.Mock;
const mockGetRefreshToken = getRefreshToken as jest.Mock;

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn(async () => body),
});

const invalidJsonResponse = (status: number) => ({
  ok: false,
  status,
  json: jest.fn(async () => {
    throw new SyntaxError('Unexpected token < in JSON');
  }),
});

describe('serverFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAccessToken.mockResolvedValue('access-token');
  });

  it('returns parsed JSON and attaches the bearer token', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { hello: 'world' }));

    const result = await serverFetch<{ hello: string }>('/hello');

    expect(result).toEqual({ hello: 'world' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/hello'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      })
    );
  });

  it('refreshes on 401 token_expired and retries exactly once', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse(401, { code: 'token_expired', message: 'expired' })
      )
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    mockGetRefreshToken.mockResolvedValue('refresh-token');
    mockRefreshApi.mockResolvedValue({
      success: true,
      data: {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresAt: Date.now() + 60 * 60 * 1000,
      },
    });

    const result = await serverFetch<{ ok: boolean }>('/protected');

    expect(result).toEqual({ ok: true });
    expect(mockRefreshApi).toHaveBeenCalledTimes(1);
    expect(saveTokens).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry more than once when the server keeps returning 401', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(401, { code: 'token_expired', message: 'expired' })
    );
    mockGetRefreshToken.mockResolvedValue('refresh-token');
    mockRefreshApi.mockResolvedValue({
      success: true,
      data: {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresAt: Date.now() + 60 * 60 * 1000,
      },
    });

    await expect(serverFetch('/protected')).rejects.toBeInstanceOf(
      AuthenticationError
    );
    // 원 요청 + 재시도 1회 — 무한 재귀 없음
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockRefreshApi).toHaveBeenCalledTimes(1);
  });

  it('clears auth and throws when a 401 body is not valid JSON', async () => {
    mockFetch.mockResolvedValue(invalidJsonResponse(401));

    await expect(serverFetch('/protected')).rejects.toBeInstanceOf(
      AuthenticationError
    );
    expect(mockClearAuth).toHaveBeenCalled();
    expect(mockRefreshApi).not.toHaveBeenCalled();
  });

  it('clears auth on 401 with a non-refreshable code', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(401, { code: 'token_revoked', message: 'revoked' })
    );

    await expect(serverFetch('/protected')).rejects.toMatchObject({
      code: 'token_revoked',
    });
    expect(mockClearAuth).toHaveBeenCalled();
    expect(mockRefreshApi).not.toHaveBeenCalled();
  });

  it('clears auth when refresh fails after 401 token_expired', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(401, { code: 'token_expired', message: 'expired' })
    );
    mockGetRefreshToken.mockResolvedValue('refresh-token');
    mockRefreshApi.mockResolvedValue({
      success: false,
      error: { code: 'token_revoked', message: 'revoked' },
    });

    await expect(serverFetch('/protected')).rejects.toBeInstanceOf(
      AuthenticationError
    );
    expect(mockClearAuth).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('throws a plain error with the server message for other failures', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(500, { message: 'internal boom' })
    );

    await expect(serverFetch('/broken')).rejects.toThrow('internal boom');
  });
});
