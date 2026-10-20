import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { signUpSchema } from '@application/controllers/auth/schemas';
import type { SignUpUseCase } from '@application/usecases/auth/SignUpUseCase';

export class SignUpController extends Controller<
  'public',
  SignUpUseCase.Output
> {
  protected override readonly bodySchema = signUpSchema;

  constructor(private readonly signUp: SignUpUseCase) {
    super();
  }

  protected async handle(
    request: Controller.Request<'public', SignUpController.Body>,
  ): Promise<Controller.Response<SignUpUseCase.Output>> {
    const { accountId } = await this.signUp.execute(request.body);

    return { statusCode: 201, body: { accountId } };
  }
}

export namespace SignUpController {
  export type Body = z.infer<typeof signUpSchema>;
}
