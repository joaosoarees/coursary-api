import { Controller } from '@application/contracts/Controller';
import type { AccountProfile } from '@application/usecases/account/AccountProfile';
import type { GetMeUseCase } from '@application/usecases/account/GetMeUseCase';

export class GetMeController extends Controller<'private', AccountProfile> {
  constructor(private readonly getMe: GetMeUseCase) {
    super();
  }

  protected handle({
    account,
  }: Controller.Request<'private'>): Promise<
    Controller.Response<AccountProfile>
  > {
    const profile = this.getMe.execute({ account });

    return Promise.resolve({ statusCode: 200, body: profile });
  }
}
