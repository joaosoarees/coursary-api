import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import type { Page } from '@application/contracts/Page';
import { Account, accountRoles } from '@application/entities/account/Account';
import {
  BOOTSTRAP_ACTOR,
  RoleChange,
} from '@application/entities/account/RoleChange';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { AccountItem } from '@infra/database/dynamo/items/account/AccountItem';
import { RoleChangeItem } from '@infra/database/dynamo/items/account/RoleChangeItem';
import { DynamoListRoleChangesQuery } from '@infra/database/dynamo/queries/admin/DynamoListRoleChangesQuery';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();
const listRoleChanges = new DynamoListRoleChangesQuery(config);

async function putAccount(
  status: Account.Status,
  overrides: Partial<AccountItem.ItemType> = {},
) {
  const account = new Account({
    id: anAccountId(),
    externalId: undefined,
    email: `user-${crypto.randomUUID()}@example.com`,
    name: 'Ana',
    role: accountRoles.Instructor,
    status,
    createdAt: new Date(),
    session: undefined,
  });
  const Item = { ...AccountItem.fromEntity(account).toItem(), ...overrides };

  await dynamoClient.send(
    new PutCommand({ TableName: config.mainTableName, Item }),
  );

  return account;
}

// A KSUID keeps time to the second; ids from the same second sort by their random part.
const newestFirst = (ids: Iterable<string>) => [...ids].sort().reverse();

async function readAll<TItem>(
  read: (page: Page.Options) => Promise<Page<TItem>>,
  limit: number,
) {
  const items: TItem[] = [];
  let cursor: string | undefined;

  do {
    const page = await read({ limit, cursor });
    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);

  return items;
}

describe('DynamoListRoleChangesQuery', () => {
  it('should list the role changes of an account, newest first', async () => {
    const account = await putAccount('ACTIVE');
    const changes = [];

    for (const toRole of ['admin', 'student', 'instructor'] as const) {
      const change = RoleChange.create({
        account,
        toRole,
        changedBy: BOOTSTRAP_ACTOR,
      });
      account.role = toRole;
      changes.push(change);
      await dynamoClient.send(
        new PutCommand({
          TableName: config.mainTableName,
          Item: RoleChangeItem.fromEntity(change).toItem(),
        }),
      );
    }

    const listed = await readAll(
      (page) => listRoleChanges.execute({ accountId: account.id, page }),
      2,
    );

    expect(listed.map((item) => item.id)).toEqual(
      newestFirst(changes.map((change) => change.id)),
    );
    expect(listed).toContainEqual(
      expect.objectContaining({
        fromRole: 'student',
        toRole: 'instructor',
        changedBy: 'bootstrap',
      }),
    );
  });
});
