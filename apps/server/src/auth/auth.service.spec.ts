import {
  BadRequestException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from './auth.service';

// jose v6 is ESM-only; replicate decodeJwt for the CJS jest runtime
jest.mock('jose', () => ({
  decodeJwt: (token: string) =>
    JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()),
}));

const b64url = (obj: Record<string, unknown>) =>
  Buffer.from(JSON.stringify(obj)).toString('base64url');

const makeJwt = (payload: Record<string, unknown>) =>
  `${b64url({ alg: 'ES256', typ: 'JWT' })}.${b64url(payload)}.sig`;

const gotrueResponse = (status: number, body: Record<string, unknown>) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as Response;

describe('AuthService', () => {
  let service: AuthService;
  let fetchMock: jest.Mock;

  const supabaseService = {
    getUrl: () => 'https://test.supabase.co',
    getAnonKey: () => 'anon-key',
    getServiceRoleKey: () => 'service-role-key',
  } as unknown as SupabaseService;

  beforeEach(() => {
    service = new AuthService(supabaseService);
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  describe('login', () => {
    it('returns tokens and user on success', async () => {
      fetchMock.mockResolvedValue(
        gotrueResponse(200, {
          access_token: 'at',
          refresh_token: 'rt',
          expires_at: 1750000000,
          user: { id: 'user-1', email: 'a@b.com' },
        }),
      );

      const result = await service.login('a@b.com', 'password123');

      expect(result).toEqual({
        accessToken: 'at',
        refreshToken: 'rt',
        expiresAt: 1750000000000,
        user: { id: 'user-1', email: 'a@b.com' },
      });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://test.supabase.co/auth/v1/token?grant_type=password',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ apikey: 'anon-key' }),
        }),
      );
    });

    it('throws invalid_credentials on GoTrue 400', async () => {
      fetchMock.mockResolvedValue(
        gotrueResponse(400, { error_description: 'Invalid login credentials' }),
      );

      await expect(service.login('a@b.com', 'wrongpass1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.login('a@b.com', 'wrongpass1')).rejects.toMatchObject({
        response: { code: 'invalid_credentials' },
      });
    });

    it('throws 503 on GoTrue 5xx instead of invalid_credentials', async () => {
      fetchMock.mockResolvedValue(gotrueResponse(502, { msg: 'Bad gateway' }));

      await expect(service.login('a@b.com', 'password123')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('throws 429 on GoTrue rate limit', async () => {
      fetchMock.mockResolvedValue(
        gotrueResponse(429, { msg: 'Rate limit exceeded' }),
      );

      const promise = service.login('a@b.com', 'password123');
      await expect(promise).rejects.toThrow(HttpException);
      await expect(
        service.login('a@b.com', 'password123'),
      ).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
    });

    it('throws 503 on network failure', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));

      await expect(service.login('a@b.com', 'password123')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('signUp', () => {
    it('returns user on success', async () => {
      fetchMock.mockResolvedValue(
        gotrueResponse(200, {
          access_token: 'at',
          refresh_token: 'rt',
          expires_at: 1750000000,
          user: { id: 'user-1', email: 'a@b.com' },
        }),
      );

      const result = await service.signUp('a@b.com', 'password123');

      expect(result.user).toEqual({ id: 'user-1', email: 'a@b.com' });
      expect(result.accessToken).toBe('at');
      expect(result.expiresAt).toBe(1750000000000);
    });

    it('maps already-registered to user_already_exists', async () => {
      fetchMock.mockResolvedValue(
        gotrueResponse(422, { msg: 'User already registered' }),
      );

      await expect(
        service.signUp('a@b.com', 'password123'),
      ).rejects.toMatchObject({
        response: { code: 'user_already_exists' },
      });
    });

    it('throws 503 on GoTrue 5xx', async () => {
      fetchMock.mockResolvedValue(gotrueResponse(500, { msg: 'boom' }));

      await expect(service.signUp('a@b.com', 'password123')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('refresh', () => {
    it('returns new tokens on success', async () => {
      fetchMock.mockResolvedValue(
        gotrueResponse(200, {
          access_token: 'new-at',
          refresh_token: 'new-rt',
          expires_at: 1750000000,
        }),
      );

      const result = await service.refresh('old-rt');

      expect(result).toEqual({
        accessToken: 'new-at',
        refreshToken: 'new-rt',
        expiresAt: 1750000000000,
      });
    });

    it('throws token_revoked on GoTrue 400', async () => {
      fetchMock.mockResolvedValue(
        gotrueResponse(400, { error_description: 'Refresh token revoked' }),
      );

      await expect(service.refresh('revoked-rt')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refresh('revoked-rt')).rejects.toMatchObject({
        response: { code: 'token_revoked' },
      });
    });

    it('throws 503 on GoTrue 5xx instead of token_revoked', async () => {
      fetchMock.mockResolvedValue(gotrueResponse(503, { msg: 'unavailable' }));

      await expect(service.refresh('old-rt')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('oauthCallback', () => {
    it('uses the access token exp claim for expiresAt', async () => {
      const exp = Math.floor(Date.now() / 1000) + 1234;
      const accessToken = makeJwt({ sub: 'user-1', exp });
      fetchMock.mockResolvedValue(
        gotrueResponse(200, { id: 'user-1', email: 'a@b.com' }),
      );

      const result = await service.oauthCallback(accessToken, 'rt');

      expect(result.expiresAt).toBe(exp * 1000);
      expect(result.user).toEqual({ id: 'user-1', email: 'a@b.com' });
    });

    it('throws invalid_oauth_token on GoTrue 401', async () => {
      fetchMock.mockResolvedValue(gotrueResponse(401, { msg: 'bad token' }));

      await expect(service.oauthCallback('bad-token', 'rt')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws 503 on GoTrue 5xx', async () => {
      fetchMock.mockResolvedValue(gotrueResponse(500, { msg: 'boom' }));

      await expect(service.oauthCallback('token', 'rt')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('deleteAccount', () => {
    it('uses the service-role key against the admin endpoint', async () => {
      fetchMock.mockResolvedValue(gotrueResponse(200, {}));

      const result = await service.deleteAccount('user-1');

      expect(result).toEqual({ success: true });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://test.supabase.co/auth/v1/admin/users/user-1',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            apikey: 'service-role-key',
            Authorization: 'Bearer service-role-key',
          }),
        }),
      );
    });

    it('throws account_deletion_failed on admin API error', async () => {
      fetchMock.mockResolvedValue(gotrueResponse(500, { msg: 'boom' }));

      await expect(service.deleteAccount('user-1')).rejects.toMatchObject({
        response: { code: 'account_deletion_failed' },
      });
    });
  });
});
