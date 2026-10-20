import { Account } from '@application/entities/account/Account';
import { AccountProfile } from '@application/usecases/account/AccountProfile';

export class GetMeUseCase {
  execute({ account }: GetMeUseCase.Input): AccountProfile {
    const activeAccount = Account.requireActive(account);

    return AccountProfile.fromAccount(activeAccount);
  }
}

export namespace GetMeUseCase {
  export interface Input {
    account: Account;
  }
}
