import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { updateMeSchema } from '@application/controllers/account/schemas';
import type { AccountProfile } from '@application/usecases/account/AccountProfile';
import type { UpdateMeUseCase } from '@application/usecases/account/UpdateMeUseCase';

export class UpdateMeController extends Controller<'private', AccountProfile> {
  protected override readonly bodySchema = updateMeSchema;

  constructor(private readonly updateMe: UpdateMeUseCase) {
    super();
  }

  protected async handle({
    account,
    body,
  }: Controller.Request<'private', UpdateMeController.Body>): Promise<
    Controller.Response<AccountProfile>
  > {
    const profile = await this.updateMe.execute({ account, name: body.name });

    return { statusCode: 200, body: profile };
  }
}

export namespace UpdateMeController {
  export type Body = z.infer<typeof updateMeSchema>;
}
