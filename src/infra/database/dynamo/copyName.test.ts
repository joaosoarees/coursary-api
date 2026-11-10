import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it } from 'vitest';

import { dynamoClient } from '@infra/clients/dynamoClient';
import { copyName } from '@infra/database/dynamo/copyName';
import { AppConfig } from '@shared/config/AppConfig';

const tableName = new AppConfig().mainTableName;

const put = async (
  PK: string,
  studentName: string,
  extra: Record<string, unknown> = {},
) => {
  await dynamoClient.send(
    new PutCommand({
      TableName: tableName,
      Item: { PK, SK: 'COPY', studentName, ...extra },
    }),
  );

  return { PK, SK: 'COPY' };
};

const nameAt = async (Key: Record<string, unknown>) =>
  (
    (await dynamoClient.send(new GetCommand({ TableName: tableName, Key })))
      .Item as { studentName?: string } | undefined
  )?.studentName;

describe('copyName', () => {
  it('should update every item, skipping one already renamed and one gone', async () => {
    const id = crypto.randomUUID();
    const keys = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        put(`COPY#${id}#${String(i)}`, 'Old'),
      ),
    );
    await put(`COPY#${id}#done`, 'New');
    const gone = { PK: `COPY#${id}#gone`, SK: 'COPY' };

    await copyName({
      tableName,
      keys: [...keys, { PK: `COPY#${id}#done`, SK: 'COPY' }, gone],
      attribute: 'studentName',
      name: 'New',
    });

    const names = await Promise.all(keys.map(nameAt));
    expect(names).toEqual(Array.from({ length: 6 }, () => 'New'));
    await expect(nameAt(gone)).resolves.toBeUndefined();
  });

  it('should skip an item that fails the extra condition', async () => {
    const id = crypto.randomUUID();
    const indexed = await put(`COPY#${id}#indexed`, 'Old', { GSI1PK: 'X' });
    const left = await put(`COPY#${id}#left`, 'Old');

    await copyName({
      tableName,
      keys: [indexed, left],
      attribute: 'studentName',
      name: 'New',
      condition: 'attribute_exists(GSI1PK)',
    });

    await expect(nameAt(indexed)).resolves.toBe('New');
    await expect(nameAt(left)).resolves.toBe('Old');
  });
});
