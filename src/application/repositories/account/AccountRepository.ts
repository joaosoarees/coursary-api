import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Account } from '@application/entities/account/Account';
import type { RoleChange } from '@application/entities/account/RoleChange';
import type { File } from '@application/entities/file/File';

export interface AccountRepository {
  create: (account: Account) => Promise<void>;

  delete: (account: Account) => Promise<void>;

  saveExternalId: (account: Account) => Promise<void>;

  findById: (
    id: Account.Id,
    options?: AccountRepository.ReadOptions,
  ) => Promise<Account | null>;

  findByEmail: (email: string) => Promise<Account | null>;

  activate: (account: Account) => Promise<void>;

  updateName: (id: Account.Id, name: string) => Promise<Account>;

  changeRole: (
    roleChange: RoleChange,
    options?: AccountRepository.ChangeRoleOptions,
  ) => Promise<void>;

  saveSession: (
    accountId: Account.Id,
    session: Account.Session,
  ) => Promise<void>;

  rotateSession: (
    accountId: Account.Id,
    previousRefreshTokenHash: string,
    session: Account.Session,
  ) => Promise<void>;

  clearSession: (accountId: Account.Id) => Promise<void>;

  // Fails with Conflict when the avatar is no longer the one read (Q85).
  setAvatarOperation: (
    accountId: Account.Id,
    avatar: Account.Avatar,
    previousFileId: File.Id | undefined,
  ) => UnitOfWork.Operation;

  changeStatus: (
    statusChange: AccountRepository.StatusChange,
    adminCallerId: Account.Id,
  ) => Promise<void>;
}

export namespace AccountRepository {
  export interface ReadOptions {
    consistent?: boolean;
  }

  export interface ChangeRoleOptions {
    adminCallerId?: Account.Id;
  }

  export interface StatusChange {
    accountId: Account.Id;
    fromStatus: Account.Status;
    toStatus: Account.Status;
  }
}
