import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { signInSchema } from '@application/controllers/auth/schemas';
import { SessionCookie } from '@application/controllers/auth/SessionCookie';
import type { SignInUseCase } from '@application/usecases/auth/SignInUseCase';

export class SignInController extends Controller<'public', SessionCookie.Body> {
  protected override readonly bodySchema = signInSchema;

  constructor(private readonly signIn: SignInUseCase) {
    super();
  }

  protected async handle(
    request: Controller.Request<'public', SignInController.Body>,
  ): Promise<Controller.Response<SessionCookie.Body>> {
    const tokens = await this.signIn.execute(request.body);

    return SessionCookie.respond(tokens);
  }
}

export namespace SignInController {
  export type Body = z.infer<typeof signInSchema>;
}
