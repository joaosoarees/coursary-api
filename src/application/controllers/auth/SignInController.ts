import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { signInSchema } from '@application/controllers/auth/schemas';
import { SessionCookie } from '@application/controllers/auth/SessionCookie';
import type { SignInUseCase } from '@application/usecases/auth/SignInUseCase';
import type { AppConfig } from '@shared/config/AppConfig';

// Only for the site's pages: a form on another site could otherwise sign the browser in to the
// attacker's account, cookie and all (login CSRF).
export class SignInController extends Controller<'public', SessionCookie.Body> {
  protected override readonly bodySchema = signInSchema;

  constructor(
    private readonly signIn: SignInUseCase,
    private readonly config: AppConfig,
  ) {
    super();
  }

  protected async handle(
    request: Controller.Request<'public', SignInController.Body>,
  ): Promise<Controller.Response<SessionCookie.Body>> {
    SessionCookie.requireSiteOrigin(request.headers, this.config.siteOrigin);
    const tokens = await this.signIn.execute(request.body);

    return SessionCookie.respond(tokens);
  }
}

export namespace SignInController {
  export type Body = z.infer<typeof signInSchema>;
}
