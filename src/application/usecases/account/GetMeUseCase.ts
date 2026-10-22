import { Account } from '@application/entities/account/Account';
import type { PublicAssetUrls } from '@application/gateways/file/PublicAssetUrls';
import { AccountProfile } from '@application/usecases/account/AccountProfile';

export class GetMeUseCase {
  constructor(private readonly assetUrls: PublicAssetUrls) {}

  execute({ account }: GetMeUseCase.Input): AccountProfile {
    const activeAccount = Account.requireActive(account);

    return AccountProfile.fromAccount(activeAccount, this.assetUrls);
  }
}

export namespace GetMeUseCase {
  export interface Input {
    account: Account;
  }
}
