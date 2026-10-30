import { describe, expect, it } from 'vitest';

import { RefreshTokensController } from '@application/controllers/auth/RefreshTokensController';
import { SessionCookie } from '@application/controllers/auth/SessionCookie';
import { InvalidSession } from '@application/errors/auth';
import type { RefreshTokensUseCase } from '@application/usecases/auth/RefreshTokensUseCase';

// Only the cookie handling is under test: the use case answers with new tokens.
const received: string[] = [];
const refreshTokens = {
  execute: ({ refreshToken }: RefreshTokensUseCase.Input) => {
    received.push(refreshToken);

    return Promise.resolve({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
      expiresIn: 3600,
    });
  },
} as unknown as RefreshTokensUseCase;

const request = (cookies: Record<string, string>) => ({
  body: {},
  params: {},
  queryParams: {},
  headers: {},
  cookies,
  accountId: null,
  role: null,
  account: null,
});

describe('RefreshTokensController', () => {
  it('should refresh from the cookie and set the new refresh token in it', async () => {
    const response = await new RefreshTokensController(refreshTokens).execute(
      request({ coursary_refresh: 'refresh-1' }),
    );

    expect(received.at(-1)).toBe('refresh-1');
    expect(response).toEqual({
      statusCode: 200,
      body: { accessToken: 'access-2', expiresIn: 3600 },
      cookies: [SessionCookie.set('refresh-2')],
    });
  });

  it('should refuse a request without a session cookie', async () => {
    await expect(
      new RefreshTokensController(refreshTokens).execute(request({})),
    ).rejects.toBeInstanceOf(InvalidSession);
  });
});
