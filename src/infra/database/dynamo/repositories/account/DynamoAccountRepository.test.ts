import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import { Account, accountRoles } from '@application/entities/account/Account';
import {
  BOOTSTRAP_ACTOR,
  RoleChange,
} from '@application/entities/account/RoleChange';
import { AccountConflict } from '@application/errors/account';
import { EmailInUse, InvalidSession } from '@application/errors/auth';
import { Forbidden } from '@application/errors/common';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoAccountRepository } from '@infra/database/dynamo/repositories/account/DynamoAccountRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();
const repository = new DynamoAccountRepository(config);

const uniqueEmail = () => `user-${crypto.randomUUID()}@example.com`;

async function getItem(PK: string) {
  const { Item } = await dynamoClient.send(
    new GetCommand({
      TableName: config.mainTableName,
      Key: { PK, SK: PK },
      ConsistentRead: true,
    }),
  );

  return Item;
}

describe('DynamoAccountRepository.create', () => {
  it('should write the account and the claim on its e-mail', async () => {
    const account = Account.create({ name: 'Ana', email: uniqueEmail() });

    await repository.create(account);

    expect(await getItem(`ACCOUNT#${account.id}`)).toMatchObject({
      type: 'Account',
      email: account.email,
      status: 'PENDING',
    });
    expect(await getItem(`EMAIL_CLAIM#${account.email}`)).toMatchObject({
      type: 'EmailClaim',
      accountId: account.id,
    });
  });

  it('should refuse a second account with the same e-mail and write nothing for it', async () => {
    const email = uniqueEmail();
    await repository.create(Account.create({ name: 'Ana', email }));
    const second = Account.create({ name: 'Bia', email });

    await expect(repository.create(second)).rejects.toBeInstanceOf(EmailInUse);
    expect(await getItem(`ACCOUNT#${second.id}`)).toBeUndefined();
  });

  it('should treat e-mails that differ only in case as the same address', async () => {
    const email = uniqueEmail();
    await repository.create(Account.create({ name: 'Ana', email }));

    await expect(
      repository.create(
        Account.create({ name: 'Bia', email: email.toUpperCase() }),
      ),
    ).rejects.toBeInstanceOf(EmailInUse);
  });

  it('should take over a claim that has expired but was not yet removed by TTL', async () => {
    const email = uniqueEmail();
    await dynamoClient.send(
      new PutCommand({
        TableName: config.mainTableName,
        Item: {
          PK: `EMAIL_CLAIM#${email}`,
          SK: `EMAIL_CLAIM#${email}`,
          type: 'EmailClaim',
          email,
          accountId: 'abandoned',
          expiresAt: Math.floor(Date.now() / 1000) - 60,
        },
      }),
    );
    const account = Account.create({ name: 'Ana', email });

    await repository.create(account);

    expect(await getItem(`EMAIL_CLAIM#${email}`)).toMatchObject({
      accountId: account.id,
    });
  });

  it('should let only one of two simultaneous sign-ups with the same e-mail through', async () => {
    const email = uniqueEmail();

    const results = await Promise.allSettled([
      repository.create(Account.create({ name: 'Ana', email })),
      repository.create(Account.create({ name: 'Bia', email })),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
  });
});

describe('DynamoAccountRepository.delete', () => {
  it('should remove the account and free its e-mail', async () => {
    const email = uniqueEmail();
    const account = Account.create({ name: 'Ana', email });
    await repository.create(account);

    await repository.delete(account);

    expect(await getItem(`ACCOUNT#${account.id}`)).toBeUndefined();
    expect(await getItem(`EMAIL_CLAIM#${email}`)).toBeUndefined();
    await expect(
      repository.create(Account.create({ name: 'Bia', email })),
    ).resolves.toBeUndefined();
  });

  it('should remove the account but keep a claim that another account took', async () => {
    const email = uniqueEmail();
    const owner = Account.create({ name: 'Ana', email });
    await repository.create(owner);
    const stranger = Account.create({ name: 'Bia', email });
    await repository.create(
      Account.create({ name: 'Caio', email: uniqueEmail() }),
    );

    await expect(repository.delete(stranger)).resolves.toBeUndefined();
    expect(await getItem(`EMAIL_CLAIM#${email}`)).toMatchObject({
      accountId: owner.id,
    });
    expect(await getItem(`ACCOUNT#${owner.id}`)).toBeDefined();
  });
});

describe('DynamoAccountRepository.saveExternalId', () => {
  it('should store the identity provider id on the account', async () => {
    const account = Account.create({ name: 'Ana', email: uniqueEmail() });
    await repository.create(account);
    account.externalId = 'cognito-sub-1';

    await repository.saveExternalId(account);

    expect(await getItem(`ACCOUNT#${account.id}`)).toMatchObject({
      externalId: 'cognito-sub-1',
    });
  });

  it('should refuse an account that does not exist', async () => {
    const account = Account.create({ name: 'Ana', email: uniqueEmail() });
    account.externalId = 'cognito-sub-1';

    await expect(repository.saveExternalId(account)).rejects.toThrow();
    expect(await getItem(`ACCOUNT#${account.id}`)).toBeUndefined();
  });
});

describe('DynamoAccountRepository.findByEmail', () => {
  it('should find a pending account through the claim on its e-mail', async () => {
    const email = uniqueEmail();
    const account = Account.create({ name: 'Ana', email });
    await repository.create(account);

    const found = await repository.findByEmail(` ${email.toUpperCase()} `);

    expect(found).toMatchObject({ id: account.id, email, status: 'PENDING' });
  });

  it('should find nothing for an unknown e-mail', async () => {
    await expect(repository.findByEmail(uniqueEmail())).resolves.toBeNull();
  });

  it('should find nothing once the claim has expired', async () => {
    const account = Account.create({ name: 'Ana', email: uniqueEmail() });
    await repository.create(account);
    await dynamoClient.send(
      new UpdateCommand({
        TableName: config.mainTableName,
        Key: {
          PK: `EMAIL_CLAIM#${account.email}`,
          SK: `EMAIL_CLAIM#${account.email}`,
        },
        UpdateExpression: 'SET expiresAt = :past',
        ExpressionAttributeValues: {
          ':past': Math.floor(Date.now() / 1000) - 60,
        },
      }),
    );

    await expect(repository.findByEmail(account.email)).resolves.toBeNull();
  });

  it('should find an active account as well', async () => {
    const account = Account.create({ name: 'Ana', email: uniqueEmail() });
    await repository.create(account);
    account.activate();
    await repository.activate(account);

    await expect(repository.findByEmail(account.email)).resolves.toMatchObject({
      id: account.id,
      status: 'ACTIVE',
    });
  });
});

describe('DynamoAccountRepository.activate', () => {
  it('should mark the account active and keep it and its claim for good', async () => {
    const account = Account.create({ name: 'Ana', email: uniqueEmail() });
    await repository.create(account);
    account.activate();

    await repository.activate(account);

    const accountItem = await getItem(`ACCOUNT#${account.id}`);
    const claimItem = await getItem(`EMAIL_CLAIM#${account.email}`);
    expect(accountItem).toMatchObject({ status: 'ACTIVE' });
    expect(accountItem).not.toHaveProperty('expiresAt');
    expect(claimItem).toMatchObject({ accountId: account.id });
    expect(claimItem).not.toHaveProperty('expiresAt');
  });

  it('should refuse an account that is no longer pending', async () => {
    const account = Account.create({ name: 'Ana', email: uniqueEmail() });
    await repository.create(account);
    account.activate();
    await repository.activate(account);

    await expect(repository.activate(account)).rejects.toThrow();
  });
});

describe('DynamoAccountRepository.findById', () => {
  it('should find an account by its id', async () => {
    const account = Account.create({ name: 'Ana', email: uniqueEmail() });
    await repository.create(account);

    await expect(repository.findById(account.id)).resolves.toMatchObject({
      id: account.id,
      email: account.email,
      role: 'student',
    });
  });

  it('should find nothing for an unknown id', async () => {
    await expect(repository.findById(anAccountId())).resolves.toBeNull();
  });

  it('should find nothing once the account has expired', async () => {
    const account = Account.create({ name: 'Ana', email: uniqueEmail() });
    await repository.create(account);
    await dynamoClient.send(
      new UpdateCommand({
        TableName: config.mainTableName,
        Key: { PK: `ACCOUNT#${account.id}`, SK: `ACCOUNT#${account.id}` },
        UpdateExpression: 'SET expiresAt = :past',
        ExpressionAttributeValues: {
          ':past': Math.floor(Date.now() / 1000) - 60,
        },
      }),
    );

    await expect(repository.findById(account.id)).resolves.toBeNull();
  });
});

describe('DynamoAccountRepository.updateName', () => {
  it('should change the name and return the account as stored', async () => {
    const account = Account.create({ name: 'Ana', email: uniqueEmail() });
    await repository.create(account);

    const updated = await repository.updateName(account.id, 'Ana Souza');

    expect(updated).toMatchObject({
      id: account.id,
      name: 'Ana Souza',
      email: account.email,
    });
    expect(await getItem(`ACCOUNT#${account.id}`)).toMatchObject({
      name: 'Ana Souza',
    });
  });

  it('should refuse an account that does not exist', async () => {
    await expect(repository.updateName(anAccountId(), 'Ana')).rejects.toThrow();
    expect(await getItem('ACCOUNT#missing')).toBeUndefined();
  });
});

describe('DynamoAccountRepository.changeRole', () => {
  const activeAccount = async () => {
    const account = Account.create({ name: 'Ana', email: uniqueEmail() });
    await repository.create(account);
    account.activate();
    await repository.activate(account);

    return account;
  };

  const getRoleChange = async (accountId: string, id: string) => {
    const { Item } = await dynamoClient.send(
      new GetCommand({
        TableName: config.mainTableName,
        Key: { PK: `ACCOUNT#${accountId}`, SK: `ROLE_CHANGE#${id}` },
        ConsistentRead: true,
      }),
    );

    return Item;
  };

  it('should change the role and its index key, and record the change', async () => {
    const account = await activeAccount();
    const change = RoleChange.create({
      account,
      toRole: accountRoles.Admin,
      changedBy: BOOTSTRAP_ACTOR,
    });

    await repository.changeRole(change);

    expect(await getItem(`ACCOUNT#${account.id}`)).toMatchObject({
      role: 'admin',
      GSI1PK: 'ROLE#admin',
    });
    expect(await getRoleChange(account.id, change.id)).toMatchObject({
      fromRole: 'student',
      toRole: 'admin',
      changedBy: 'bootstrap',
    });
  });

  it('should refuse an account that is not active and record nothing', async () => {
    const account = Account.create({ name: 'Ana', email: uniqueEmail() });
    await repository.create(account);
    const change = RoleChange.create({
      account,
      toRole: accountRoles.Admin,
      changedBy: BOOTSTRAP_ACTOR,
    });

    await expect(repository.changeRole(change)).rejects.toThrow();
    expect(await getItem(`ACCOUNT#${account.id}`)).toMatchObject({
      role: 'student',
    });
    expect(await getRoleChange(account.id, change.id)).toBeUndefined();
  });

  it('should refuse a change made from a role the account no longer has', async () => {
    const account = await activeAccount();
    const first = RoleChange.create({
      account,
      toRole: accountRoles.Instructor,
      changedBy: BOOTSTRAP_ACTOR,
    });
    const stale = RoleChange.create({
      account,
      toRole: accountRoles.Admin,
      changedBy: BOOTSTRAP_ACTOR,
    });
    await repository.changeRole(first);

    await expect(repository.changeRole(stale)).rejects.toBeInstanceOf(
      AccountConflict,
    );
    expect(await getItem(`ACCOUNT#${account.id}`)).toMatchObject({
      role: 'instructor',
    });
  });

  const adminAccount = async () => {
    const account = await activeAccount();
    const promotion = RoleChange.create({
      account,
      toRole: accountRoles.Admin,
      changedBy: BOOTSTRAP_ACTOR,
    });
    await repository.changeRole(promotion);
    account.role = accountRoles.Admin;

    return account;
  };

  const demotion = (account: Account, caller: Account) =>
    repository.changeRole(
      RoleChange.create({
        account,
        toRole: accountRoles.Student,
        changedBy: caller.id,
      }),
      { adminCallerId: caller.id },
    );

  it('should refuse a caller who is no longer admin and record nothing', async () => {
    const ana = await adminAccount();
    const bia = await adminAccount();
    await demotion(bia, ana);
    const change = RoleChange.create({
      account: ana,
      toRole: accountRoles.Student,
      changedBy: bia.id,
    });

    await expect(
      repository.changeRole(change, { adminCallerId: bia.id }),
    ).rejects.toBeInstanceOf(Forbidden);
    expect(await getItem(`ACCOUNT#${ana.id}`)).toMatchObject({
      role: 'admin',
    });
    expect(await getRoleChange(ana.id, change.id)).toBeUndefined();
  });

  it('should leave one admin when two admins demote each other at the same time', async () => {
    const ana = await adminAccount();
    const bia = await adminAccount();

    const results = await Promise.allSettled([
      demotion(bia, ana),
      demotion(ana, bia),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const roles = [
      (await getItem(`ACCOUNT#${ana.id}`))?.role,
      (await getItem(`ACCOUNT#${bia.id}`))?.role,
    ];
    expect(roles.sort()).toEqual(['admin', 'student']);
  });
});

describe('DynamoAccountRepository.changeStatus', () => {
  const adminAccount = async () => {
    const account = Account.create({ name: 'Ana', email: uniqueEmail() });
    await repository.create(account);
    account.activate();
    await repository.activate(account);
    await repository.changeRole(
      RoleChange.create({
        account,
        toRole: accountRoles.Admin,
        changedBy: BOOTSTRAP_ACTOR,
      }),
    );
    account.role = accountRoles.Admin;

    return account;
  };

  const disable = (account: Account, caller: Account) =>
    repository.changeStatus(
      { accountId: account.id, fromStatus: 'ACTIVE', toStatus: 'DISABLED' },
      caller.id,
    );

  it('should disable an account, ending its session, and enable it', async () => {
    const admin = await adminAccount();
    const target = await adminAccount();
    await repository.saveSession(target.id, {
      accessJti: 'jti-1',
      refreshTokenHash: 'hash-1',
    });

    await disable(target, admin);
    expect(await getItem(`ACCOUNT#${target.id}`)).toMatchObject({
      status: 'DISABLED',
    });
    expect((await getItem(`ACCOUNT#${target.id}`))?.session).toBeUndefined();

    await repository.changeStatus(
      { accountId: target.id, fromStatus: 'DISABLED', toStatus: 'ACTIVE' },
      admin.id,
    );
    expect(await getItem(`ACCOUNT#${target.id}`)).toMatchObject({
      status: 'ACTIVE',
    });
  });

  it('should refuse a change from a status the account no longer has', async () => {
    const admin = await adminAccount();
    const target = await adminAccount();
    await disable(target, admin);

    await expect(disable(target, admin)).rejects.toBeInstanceOf(
      AccountConflict,
    );
  });

  it('should refuse a caller who is no longer an active admin', async () => {
    const ana = await adminAccount();
    const bia = await adminAccount();
    const caio = await adminAccount();
    await disable(bia, ana);

    await expect(disable(caio, bia)).rejects.toBeInstanceOf(Forbidden);
    expect(await getItem(`ACCOUNT#${caio.id}`)).toMatchObject({
      status: 'ACTIVE',
    });
  });

  it('should leave one active admin when two admins disable each other at the same time', async () => {
    const ana = await adminAccount();
    const bia = await adminAccount();

    const results = await Promise.allSettled([
      disable(bia, ana),
      disable(ana, bia),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const statuses = [
      (await getItem(`ACCOUNT#${ana.id}`))?.status,
      (await getItem(`ACCOUNT#${bia.id}`))?.status,
    ];
    expect(statuses.sort()).toEqual(['ACTIVE', 'DISABLED']);
  });
});

describe('DynamoAccountRepository sessions', () => {
  const signedIn = async () => {
    const account = Account.create({ name: 'Ana', email: uniqueEmail() });
    await repository.create(account);
    const session = { accessJti: 'jti-1', refreshTokenHash: 'hash-1' };
    await repository.saveSession(account.id, session);

    return account;
  };

  it('should save the session on the account', async () => {
    const account = await signedIn();

    expect((await repository.findById(account.id))?.session).toEqual({
      accessJti: 'jti-1',
      refreshTokenHash: 'hash-1',
    });
  });

  it('should rotate the session only from the refresh token it holds', async () => {
    const account = await signedIn();
    const next = { accessJti: 'jti-2', refreshTokenHash: 'hash-2' };

    await expect(
      repository.rotateSession(account.id, 'hash-other', next),
    ).rejects.toBeInstanceOf(InvalidSession);
    await repository.rotateSession(account.id, 'hash-1', next);

    expect((await repository.findById(account.id))?.session).toEqual(next);
  });

  it('should let only one of two refreshes with the same token win', async () => {
    const account = await signedIn();

    const results = await Promise.allSettled([
      repository.rotateSession(account.id, 'hash-1', {
        accessJti: 'jti-a',
        refreshTokenHash: 'hash-a',
      }),
      repository.rotateSession(account.id, 'hash-1', {
        accessJti: 'jti-b',
        refreshTokenHash: 'hash-b',
      }),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('should clear the session so no refresh token rotates it again', async () => {
    const account = await signedIn();

    await repository.clearSession(account.id);

    expect((await repository.findById(account.id))?.session).toBeUndefined();
    await expect(
      repository.rotateSession(account.id, 'hash-1', {
        accessJti: 'jti-2',
        refreshTokenHash: 'hash-2',
      }),
    ).rejects.toBeInstanceOf(InvalidSession);
  });
});
