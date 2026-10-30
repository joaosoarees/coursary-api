import type { Controller } from '@application/contracts/Controller';
import { refreshTokenSchema } from '@application/controllers/auth/schemas';
import { Forbidden } from '@application/errors/common';
import type { AuthGateway } from '@application/gateways/auth/AuthGateway';

const COOKIE_NAME = 'coursary_refresh';

// The pool's refresh token validity, 720 hours.
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const ATTRIBUTES = 'HttpOnly; Secure; SameSite=Lax; Path=/auth';

// The refresh token in an HttpOnly cookie: bound to the API's host (no Domain) and to its
// /auth routes, out of reach of any script in the page.
export const SessionCookie = {
  respond(tokens: AuthGateway.Tokens): Controller.Response<SessionCookie.Body> {
    return {
      statusCode: 200,
      body: { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn },
      cookies: [SessionCookie.set(tokens.refreshToken)],
    };
  },

  set(refreshToken: string): string {
    return `${COOKIE_NAME}=${refreshToken}; ${ATTRIBUTES}; Max-Age=${String(MAX_AGE_SECONDS)}`;
  },

  clear(): string {
    return `${COOKIE_NAME}=; ${ATTRIBUTES}; Max-Age=0`;
  },

  // SameSite=Lax still sends the cookie from another subdomain of the same site: a route that
  // acts on it answers only the site's own pages.
  requireSiteOrigin(headers: Record<string, string>, siteOrigin: string): void {
    if (headers.origin !== siteOrigin) {
      throw new Forbidden();
    }
  },

  read(cookies: Record<string, string>): string | null {
    const parsed = refreshTokenSchema.safeParse(cookies[COOKIE_NAME]);

    return parsed.success ? parsed.data : null;
  },
};

export namespace SessionCookie {
  export type Body = Omit<AuthGateway.Tokens, 'refreshToken'>;
}
