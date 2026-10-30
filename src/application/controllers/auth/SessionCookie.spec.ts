import { describe, expect, it } from 'vitest';

import { SessionCookie } from '@application/controllers/auth/SessionCookie';

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
});
