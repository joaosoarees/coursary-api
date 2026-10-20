import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { resendConfirmationCodeSchema } from '@application/controllers/auth/schemas';
import type { ResendConfirmationCodeUseCase } from '@application/usecases/auth/ResendConfirmationCodeUseCase';

export class ResendConfirmationCodeController extends Controller<'public'> {
  protected override readonly bodySchema = resendConfirmationCodeSchema;

  constructor(
    private readonly resendConfirmationCode: ResendConfirmationCodeUseCase,
  ) {
    super();
  }

  protected async handle(
    request: Controller.Request<
      'public',
      ResendConfirmationCodeController.Body
    >,
  ): Promise<Controller.Response<undefined>> {
    await this.resendConfirmationCode.execute(request.body);

    return { statusCode: 204 };
  }
}

export namespace ResendConfirmationCodeController {
  export type Body = z.infer<typeof resendConfirmationCodeSchema>;
}
