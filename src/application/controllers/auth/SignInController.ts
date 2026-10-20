import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { signInSchema } from '@application/controllers/auth/schemas';
import type { AuthGateway } from '@application/gateways/auth/AuthGateway';
import type { SignInUseCase } from '@application/usecases/auth/SignInUseCase';

export class SignInController extends Controller<'public', AuthGateway.Tokens> {
  protected override readonly bodySchema = signInSchema;

  constructor(private readonly signIn: SignInUseCase) {
    super();
  }

  protected async handle(
    request: Controller.Request<'public', SignInController.Body>,
  ): Promise<Controller.Response<AuthGateway.Tokens>> {
    const tokens = await this.signIn.execute(request.body);

    return { statusCode: 200, body: tokens };
  }
}

export namespace SignInController {
  export type Body = z.infer<typeof signInSchema>;
}
