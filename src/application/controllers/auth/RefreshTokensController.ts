import { Controller } from '@application/contracts/Controller';
import { SessionCookie } from '@application/controllers/auth/SessionCookie';
import { InvalidSession } from '@application/errors/auth';
import type { RefreshTokensUseCase } from '@application/usecases/auth/RefreshTokensUseCase';
import type { AppConfig } from '@shared/config/AppConfig';

export class RefreshTokensController extends Controller<
  'public',
  SessionCookie.Body
> {
  constructor(
    private readonly refreshTokens: RefreshTokensUseCase,
    private readonly config: AppConfig,
  ) {
    super();
  }

  protected async handle(
    request: Controller.Request<'public'>,
  ): Promise<Controller.Response<SessionCookie.Body>> {
    SessionCookie.requireSiteOrigin(request.headers, this.config.siteOrigin);
    const refreshToken = SessionCookie.read(request.cookies);

    if (!refreshToken) {
      throw new InvalidSession();
    }

    const tokens = await this.refreshTokens.execute({ refreshToken });

    return SessionCookie.respond(tokens);
  }
}
