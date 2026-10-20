import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { forgotPasswordSchema } from '@application/controllers/auth/schemas';
import type { ForgotPasswordUseCase } from '@application/usecases/auth/ForgotPasswordUseCase';

export class ForgotPasswordController extends Controller<'public'> {
  protected override readonly bodySchema = forgotPasswordSchema;

  constructor(private readonly forgotPassword: ForgotPasswordUseCase) {
    super();
  }

  protected async handle(
    request: Controller.Request<'public', ForgotPasswordController.Body>,
  ): Promise<Controller.Response<undefined>> {
    await this.forgotPassword.execute(request.body);

    return { statusCode: 204 };
  }
}

export namespace ForgotPasswordController {
  export type Body = z.infer<typeof forgotPasswordSchema>;
}
