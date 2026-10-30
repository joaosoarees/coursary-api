import { refreshTokenSchema } from '@application/controllers/auth/schemas';

const COOKIE_NAME = 'coursary_refresh';

// The pool's refresh token validity, 720 hours.
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const ATTRIBUTES = 'HttpOnly; Secure; SameSite=Lax; Path=/auth';

// The refresh token in an HttpOnly cookie: bound to the API's host (no Domain) and to its
// /auth routes, out of reach of any script in the page (Q467, Q481).
export const SessionCookie = {
  set(refreshToken: string): string {
    return `${COOKIE_NAME}=${refreshToken}; ${ATTRIBUTES}; Max-Age=${String(MAX_AGE_SECONDS)}`;
  },

  clear(): string {
    return `${COOKIE_NAME}=; ${ATTRIBUTES}; Max-Age=0`;
  },

  // Null for a missing cookie or one that cannot be a refresh token.
  read(cookies: Record<string, string>): string | null {
    const parsed = refreshTokenSchema.safeParse(cookies[COOKIE_NAME]);

    return parsed.success ? parsed.data : null;
  },
};
