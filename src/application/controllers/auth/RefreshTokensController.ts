import { Controller } from '@application/contracts/Controller';
import { SessionCookie } from '@application/controllers/auth/SessionCookie';
import { InvalidSession } from '@application/errors/auth';
import type { RefreshTokensUseCase } from '@application/usecases/auth/RefreshTokensUseCase';

// The refresh token comes only from the session cookie, and only for the site's pages (Q481, Q482).
export class RefreshTokensController extends Controller<
  'public',
  SessionCookie.Body
> {
  constructor(
    private readonly refreshTokens: RefreshTokensUseCase,
    private readonly siteOrigin: string,
  ) {
    super();
  }

  protected async handle(
    request: Controller.Request<'public'>,
  ): Promise<Controller.Response<SessionCookie.Body>> {
    SessionCookie.requireSiteOrigin(request.headers, this.siteOrigin);
    const refreshToken = SessionCookie.read(request.cookies);

    if (!refreshToken) {
      throw new InvalidSession();
    }

    const tokens = await this.refreshTokens.execute({ refreshToken });

    return SessionCookie.respond(tokens);
  }
}
