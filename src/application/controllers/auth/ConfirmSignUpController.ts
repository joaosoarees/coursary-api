import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { confirmSignUpSchema } from '@application/controllers/auth/schemas';
import type { ConfirmSignUpUseCase } from '@application/usecases/auth/ConfirmSignUpUseCase';

export class ConfirmSignUpController extends Controller<'public'> {
  protected override readonly bodySchema = confirmSignUpSchema;

  constructor(private readonly confirmSignUp: ConfirmSignUpUseCase) {
    super();
  }

  protected async handle(
    request: Controller.Request<'public', ConfirmSignUpController.Body>,
  ): Promise<Controller.Response<undefined>> {
    await this.confirmSignUp.execute(request.body);

    return { statusCode: 204 };
  }
}

export namespace ConfirmSignUpController {
  export type Body = z.infer<typeof confirmSignUpSchema>;
}
