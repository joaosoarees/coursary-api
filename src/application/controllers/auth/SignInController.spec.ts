import { describe, expect, it } from 'vitest';

import { SessionCookie } from '@application/controllers/auth/SessionCookie';
import { SignInController } from '@application/controllers/auth/SignInController';
import { Forbidden } from '@application/errors/common';
import type { SignInUseCase } from '@application/usecases/auth/SignInUseCase';
import type { AppConfig } from '@shared/config/AppConfig';

const site = 'https://dev.example.com';
const config = { siteOrigin: site } as AppConfig;

const signIn = {
  execute: () =>
    Promise.resolve({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 3600,
    }),
} as unknown as SignInUseCase;

const request = (headers: Record<string, string>) => ({
  body: { email: 'ana@example.com', password: 'secret123' },
  params: {},
  queryParams: {},
  headers,
  cookies: {},
  accountId: null,
  role: null,
  account: null,
});

describe('SignInController', () => {
  it("should sign in from the site's origin and set the session cookie", async () => {
    const response = await new SignInController(signIn, config).execute(
      request({ origin: site }),
    );

    expect(response).toEqual({
      statusCode: 200,
      body: { accessToken: 'access', expiresIn: 3600 },
      cookies: [SessionCookie.set('refresh')],
    });
  });

  it('should refuse a sign-in from another site, which could plant its own session (login CSRF)', async () => {
    const controller = new SignInController(signIn, config);

    await expect(
      controller.execute(request({ origin: 'https://evil.example.com' })),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(controller.execute(request({}))).rejects.toBeInstanceOf(
      Forbidden,
    );
  });
});
