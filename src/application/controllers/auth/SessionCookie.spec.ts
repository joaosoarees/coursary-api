import { describe, expect, it } from 'vitest';

import { SessionCookie } from '@application/controllers/auth/SessionCookie';
import { Forbidden } from '@application/errors/common';

describe('SessionCookie', () => {
  it('should keep the token for the /auth routes of the API only, for 30 days', () => {
    expect(SessionCookie.set('eyJ.a-b_c=')).toBe(
      'coursary_refresh=eyJ.a-b_c=; HttpOnly; Secure; SameSite=Lax; Path=/auth; Max-Age=2592000',
    );
  });

  it('should clear the cookie with the same attributes', () => {
    expect(SessionCookie.clear()).toBe(
      'coursary_refresh=; HttpOnly; Secure; SameSite=Lax; Path=/auth; Max-Age=0',
    );
  });

  it('should read only a value that can be a refresh token', () => {
    expect(SessionCookie.read({ coursary_refresh: 'eyJ.a-b_c=' })).toBe(
      'eyJ.a-b_c=',
    );
    expect(SessionCookie.read({ coursary_refresh: 'a b' })).toBeNull();
    expect(SessionCookie.read({ other: 'eyJ' })).toBeNull();
  });

  it('should answer with the access token in the body and the refresh token in the cookie', () => {
    const response = SessionCookie.respond({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 3600,
    });

    expect(response).toEqual({
      statusCode: 200,
      body: { accessToken: 'access', expiresIn: 3600 },
      cookies: [SessionCookie.set('refresh')],
    });
  });

  it("should accept only the site's own origin", () => {
    const site = 'https://dev.example.com';

    expect(() => {
      SessionCookie.requireSiteOrigin({ origin: site }, site);
    }).not.toThrow();
    expect(() => {
      SessionCookie.requireSiteOrigin(
        { origin: 'https://other.example.com' },
        site,
      );
    }).toThrow(Forbidden);
    expect(() => {
      SessionCookie.requireSiteOrigin({}, site);
    }).toThrow(Forbidden);
  });
});
