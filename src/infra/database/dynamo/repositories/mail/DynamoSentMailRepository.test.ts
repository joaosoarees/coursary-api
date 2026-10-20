import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import { Account } from '@application/entities/account/Account';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoSentMailRepository } from '@infra/database/dynamo/repositories/mail/DynamoSentMailRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();
const repository = new DynamoSentMailRepository(config);
const at = (seconds: number) => new Date(seconds * 1000);

const stored = async (accountId: Account.Id) => {
  const { Item } = await dynamoClient.send(
    new GetCommand({
      TableName: config.mainTableName,
      Key: { PK: `ACCOUNT#${accountId}`, SK: 'MAIL#welcome' },
      ConsistentRead: true,
    }),
  );

  return Item;
};

describe('DynamoSentMailRepository', () => {
  it('should claim once, refuse while the lease runs and let it be taken over after', async () => {
    const accountId = Account.toId(anAccountId());
    const claim = (now: number) =>
      repository.claim({
        accountId,
        kind: 'welcome',
        now: at(now),
        leaseSeconds: 120,
      });

    await expect(claim(1000)).resolves.toBe('claimed');
    await expect(claim(1060)).resolves.toBe('busy');
    await expect(claim(1121)).resolves.toBe('claimed');
    expect(await stored(accountId)).toMatchObject({
      status: 'SENDING',
      attempts: 2,
      leaseUntil: 1241,
    });
  });

  it('should never claim an e-mail already sent', async () => {
    const accountId = Account.toId(anAccountId());
    await repository.claim({
      accountId,
      kind: 'welcome',
      now: at(1000),
      leaseSeconds: 120,
    });

    await repository.markSent({
      accountId,
      kind: 'welcome',
      sesMessageId: 'ses-1',
      sentAt: at(1001),
    });

    await expect(
      repository.claim({
        accountId,
        kind: 'welcome',
        now: at(5000),
        leaseSeconds: 120,
      }),
    ).resolves.toBe('sent');
    const item = await stored(accountId);
    expect(item).toMatchObject({ status: 'SENT', sesMessageId: 'ses-1' });
    expect(item).not.toHaveProperty('leaseUntil');
  });

  it('should accept a second mark of the same e-mail', async () => {
    const accountId = Account.toId(anAccountId());
    await repository.claim({
      accountId,
      kind: 'welcome',
      now: at(1000),
      leaseSeconds: 120,
    });
    const sent = { accountId, kind: 'welcome' as const, sentAt: at(1001) };
    await repository.markSent({ ...sent, sesMessageId: 'ses-1' });

    await expect(
      repository.markSent({ ...sent, sesMessageId: 'ses-2' }),
    ).resolves.toBeUndefined();
    expect(await stored(accountId)).toMatchObject({ sesMessageId: 'ses-1' });
  });

  it('should claim the same kind once per reference', async () => {
    const accountId = Account.toId(anAccountId());
    const claim = (ref: string) =>
      repository.claim({
        accountId,
        kind: 'course-archived',
        ref,
        now: at(1000),
        leaseSeconds: 120,
      });

    await expect(claim('c1')).resolves.toBe('claimed');
    await expect(claim('c2')).resolves.toBe('claimed');
    await expect(claim('c1')).resolves.toBe('busy');

    const { Item } = await dynamoClient.send(
      new GetCommand({
        TableName: config.mainTableName,
        Key: { PK: `ACCOUNT#${accountId}`, SK: 'MAIL#course-archived#c1' },
        ConsistentRead: true,
      }),
    );
    expect(Item).toMatchObject({ kind: 'course-archived', ref: 'c1' });
  });
});
