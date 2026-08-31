import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify } from 'jose';

import { AuthGuard } from './auth.guard';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => jest.fn()),
  jwtVerify: jest.fn(),
}));

const jwtVerifyMock = jwtVerify as unknown as jest.Mock;

const createContext = (request: Record<string, unknown>) =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('AuthGuard', () => {
  let guard: AuthGuard;

  const configService = {
    get: jest.fn(() => 'https://test.supabase.co'),
  } as unknown as ConfigService;

  beforeEach(() => {
    jwtVerifyMock.mockReset();
    guard = new AuthGuard(configService);
  });

  it('rejects requests without a Bearer token as token_invalid', async () => {
    const context = createContext({ headers: {} });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: { code: 'token_invalid' },
    });
    expect(jwtVerifyMock).not.toHaveBeenCalled();
  });

  it('rejects expired tokens as token_expired', async () => {
    const expiredError = new Error('token expired') as Error & { code: string };
    expiredError.code = 'ERR_JWT_EXPIRED';
    jwtVerifyMock.mockRejectedValue(expiredError);

    const context = createContext({
      headers: { authorization: 'Bearer expired-token' },
    });

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: { code: 'token_expired' },
    });
  });

  it('rejects tokens with invalid signatures as token_invalid', async () => {
    jwtVerifyMock.mockRejectedValue(new Error('signature verification failed'));

    const context = createContext({
      headers: { authorization: 'Bearer tampered-token' },
    });

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: { code: 'token_invalid' },
    });
  });

  it('attaches the user to the request for a valid token', async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: { sub: 'user-1', email: 'a@b.com', role: 'authenticated' },
    });

    const request: Record<string, unknown> = {
      headers: { authorization: 'Bearer valid-token' },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'user-1',
      email: 'a@b.com',
      role: 'authenticated',
    });
    expect(jwtVerifyMock).toHaveBeenCalledWith(
      'valid-token',
      expect.anything(),
      { issuer: 'https://test.supabase.co/auth/v1' },
    );
  });
});
