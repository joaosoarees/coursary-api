import { PutCommand } from '@aws-sdk/lib-dynamodb';

import {
  Account,
  accountRoles,
  accountStatuses,
} from '@application/entities/account/Account';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { AccountItem } from '@infra/database/dynamo/items/account/AccountItem';
import { DynamoListRoleChangesQuery } from '@infra/database/dynamo/queries/admin/DynamoListRoleChangesQuery';
import { DynamoAccountRepository } from '@infra/database/dynamo/repositories/account/DynamoAccountRepository';
import { DynamoCourseRepository } from '@infra/database/dynamo/repositories/course/DynamoCourseRepository';
import { DynamoFileRepository } from '@infra/database/dynamo/repositories/file/DynamoFileRepository';
import { DynamoSentMailRepository } from '@infra/database/dynamo/repositories/mail/DynamoSentMailRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();

export const uniqueEmail = (name: string) =>
  `${name}-${crypto.randomUUID()}@example.com`;

export function accountWorld() {
  const accounts = new DynamoAccountRepository(config);
  const roleChangesQuery = new DynamoListRoleChangesQuery(config);
  const sentMails = new DynamoSentMailRepository(config);
  const files = new DynamoFileRepository(config);
  const courses = new DynamoCourseRepository(config);
  const unitOfWork = () => new DynamoUnitOfWork();

  const addAccount = async ({
    name = 'ana',
    email = uniqueEmail(name),
    role = accountRoles.Student,
    status = accountStatuses.Active,
    session,
  }: {
    name?: string;
    email?: string;
    role?: Account.Role;
    status?: Account.Status;
    session?: Account.Session;
  } = {}) => {
    const account = Account.create({ name, email });
    await accounts.create(account);

    if (status !== accountStatuses.Pending) {
      account.activate();
      await accounts.activate(account);
    }

    account.role = role;
    account.status = status;
    account.session = session;
    await save(account);

    return account;
  };

  const save = async (account: Account) => {
    await dynamoClient.send(
      new PutCommand({
        TableName: config.mainTableName,
        Item: AccountItem.fromEntity(account).toItem(),
      }),
    );
  };

  const stored = async (account: Account) => accounts.findById(account.id);

  const roleChanges = async (account: Account) => {
    const { items } = await roleChangesQuery.execute({
      accountId: account.id,
      page: { limit: 50 },
    });

    return items;
  };

  const isEmailFree = async (email: string) => {
    try {
      await accounts.create(Account.create({ name: 'probe', email }));
      return true;
    } catch {
      return false;
    }
  };

  return {
    accounts,
    sentMails,
    files,
    courses,
    unitOfWork,
    addAccount,
    save,
    stored,
    roleChanges,
    isEmailFree,
  };
}
