import { Controller } from '@application/contracts/Controller';
import { SessionCookie } from '@application/controllers/auth/SessionCookie';
import type { SignOutUseCase } from '@application/usecases/auth/SignOutUseCase';

// A private route: the access token says whose session ends (Q488). Always 204, and the cookie
// leaves the browser either way.
export class SignOutController extends Controller<'private'> {
  constructor(private readonly signOut: SignOutUseCase) {
    super();
  }

  protected async handle(
    request: Controller.Request<'private'>,
  ): Promise<Controller.Response<undefined>> {
    await this.signOut.execute({
      callerId: request.accountId,
      refreshToken: SessionCookie.read(request.cookies),
    });

    return { statusCode: 204, cookies: [SessionCookie.clear()] };
  }
}
