import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { refreshTokensSchema } from '@application/controllers/auth/schemas';
import type { AuthGateway } from '@application/gateways/auth/AuthGateway';
import type { RefreshTokensUseCase } from '@application/usecases/auth/RefreshTokensUseCase';

export class RefreshTokensController extends Controller<
  'public',
  AuthGateway.Tokens
> {
  protected override readonly bodySchema = refreshTokensSchema;

  constructor(private readonly refreshTokens: RefreshTokensUseCase) {
    super();
  }

  protected async handle(
    request: Controller.Request<'public', RefreshTokensController.Body>,
  ): Promise<Controller.Response<AuthGateway.Tokens>> {
    const tokens = await this.refreshTokens.execute(request.body);

    return { statusCode: 200, body: tokens };
  }
}

export namespace RefreshTokensController {
  export type Body = z.infer<typeof refreshTokensSchema>;
}
