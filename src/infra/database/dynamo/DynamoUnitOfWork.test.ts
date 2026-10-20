import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it, vi } from 'vitest';

import { Conflict } from '@application/errors/common';
import { CourseArchived } from '@application/errors/course';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { AppConfig } from '@shared/config/AppConfig';

const TableName = new AppConfig().mainTableName;

const put = (PK: string, condition = false) =>
  DynamoUnitOfWork.operation(
    {
      Put: {
        TableName,
        Item: { PK, SK: PK, type: 'Test' },
        ...(condition
          ? { ConditionExpression: 'attribute_not_exists(PK)' }
          : {}),
      },
    },
    () => new CourseArchived(),
  );

const exists = async (PK: string) => {
  const { Item } = await dynamoClient.send(
    new GetCommand({ TableName, Key: { PK, SK: PK }, ConsistentRead: true }),
  );

  return Item !== undefined;
};

describe('DynamoUnitOfWork', () => {
  it('should write every operation it was given', async () => {
    const [a, b] = [`UOW#${crypto.randomUUID()}`, `UOW#${crypto.randomUUID()}`];
    const unit = new DynamoUnitOfWork();
    unit.add(put(a), put(b));

    await unit.commit();

    expect([await exists(a), await exists(b)]).toEqual([true, true]);
  });

  it('should throw the error of the operation whose condition failed and write nothing', async () => {
    const [taken, other] = [
      `UOW#${crypto.randomUUID()}`,
      `UOW#${crypto.randomUUID()}`,
    ];
    const first = new DynamoUnitOfWork();
    first.add(put(taken));
    await first.commit();
    const second = new DynamoUnitOfWork();
    second.add(put(other), put(taken, true));

    await expect(second.commit()).rejects.toBeInstanceOf(CourseArchived);
    expect(await exists(other)).toBe(false);
  });

  it('should retry a transaction conflict and give up with a Conflict', async () => {
    const conflict = new TransactionCanceledException({
      $metadata: {},
      message: 'conflict',
      CancellationReasons: [{ Code: 'TransactionConflict' }],
    });
    const send = vi.spyOn(dynamoClient, 'send').mockRejectedValue(conflict);
    const unit = new DynamoUnitOfWork();
    unit.add(put(`UOW#${crypto.randomUUID()}`));

    await expect(unit.commit()).rejects.toBeInstanceOf(Conflict);
    expect(send).toHaveBeenCalledTimes(DynamoUnitOfWork.maxAttempts);
    send.mockRestore();
  });
});
