import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { Account } from '@application/entities/account/Account';
import type { File } from '@application/entities/file/File';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';
import type { FileOwner } from '@application/usecases/file/FileOwner';

export class AccountAvatarOwner implements FileOwner {
  constructor(private readonly accountsRepository: AccountRepository) {}

  async readCopy(ownerId: string): Promise<FileOwner.Current | null> {
    const account = await this.accountsRepository.findById(
      Account.toId(ownerId),
      { consistent: true },
    );

    return account ? { copy: account.avatar } : null;
  }

  setCopyOperation(
    ownerId: string,
    copy: File.Copy,
    previousFileId: File.Id | undefined,
  ): UnitOfWork.Operation {
    return this.accountsRepository.setAvatarOperation(
      Account.toId(ownerId),
      copy,
      previousFileId,
    );
  }
}
