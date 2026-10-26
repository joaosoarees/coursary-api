import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it } from 'vitest';

import { accountWorld } from '@tests/support/accountWorld';
import { anAccountId } from '@tests/support/ids';

import type { Account } from '@application/entities/account/Account';
import { File } from '@application/entities/file/File';
import { Conflict } from '@application/errors/common';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { FileItem } from '@infra/database/dynamo/items/file/FileItem';
import { DynamoFileRepository } from '@infra/database/dynamo/repositories/file/DynamoFileRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();
const files = new DynamoFileRepository(config);

const setFileFields = async (file: File, fields: { expiresAt: number }) => {
  await dynamoClient.send(
    new UpdateCommand({
      TableName: config.mainTableName,
      Key: { PK: FileItem.getPK(file), SK: FileItem.getSK(file) },
      UpdateExpression: 'SET expiresAt = :expiresAt',
      ExpressionAttributeValues: { ':expiresAt': fields.expiresAt },
    }),
  );
};
const { accounts, addAccount, stored } = accountWorld();

const pendingAvatar = async (account: Account) => {
  const file = File.create({
    ownerId: account.id,
    purpose: 'avatar',
    contentType: 'image/png',
  });
  await files.create(file);

  return file;
};

// What the upload consumer commits for a processed avatar (Q85).
const processAvatar = async (account: Account, file: File) => {
  const previous = (await stored(account))?.avatar;
  const variants = { 64: `${file.id}-64.webp` };
  file.process({ size: 100, variants });

  const unit = new DynamoUnitOfWork();
  unit.add(
    files.markProcessedOperation(file),
    accounts.setAvatarOperation(
      account.id,
      { fileId: file.id, variants },
      previous?.fileId,
    ),
    ...(previous
      ? [
          files.deleteOperation({
            ownerType: file.ownerType,
            ownerId: file.ownerId,
            purpose: file.purpose,
            id: previous.fileId,
          }),
        ]
      : []),
  );
  await unit.commit();
};

describe('DynamoFileRepository', () => {
  it('should store a pending file once and read it back', async () => {
    const account = await addAccount();
    const file = await pendingAvatar(account);

    await expect(files.create(file)).rejects.toThrow();
    await expect(files.find(file)).resolves.toEqual(file);
  });

  it('should process the first avatar and copy it into the account', async () => {
    const account = await addAccount();
    const file = await pendingAvatar(account);

    await processAvatar(account, file);

    await expect(files.find(file)).resolves.toMatchObject({
      status: 'PROCESSED',
      size: 100,
    });
    expect((await stored(account))?.avatar).toEqual({
      fileId: file.id,
      variants: file.variants,
    });
  });

  it('should replace the avatar and delete the file it replaced', async () => {
    const account = await addAccount();
    const first = await pendingAvatar(account);
    await processAvatar(account, first);
    const second = await pendingAvatar(account);

    await processAvatar(account, second);

    expect((await stored(account))?.avatar?.fileId).toBe(second.id);
    await expect(files.find(first)).resolves.toBeNull();
  });

  it('should refuse a copy over an avatar the caller did not read', async () => {
    const account = await addAccount();
    const first = await pendingAvatar(account);
    const second = await pendingAvatar(account);
    await processAvatar(account, first);

    second.process({ size: 1, variants: {} });
    const unit = new DynamoUnitOfWork();
    unit.add(
      files.markProcessedOperation(second),
      accounts.setAvatarOperation(
        account.id,
        {
          fileId: second.id,
          variants: {},
        },
        undefined,
      ),
    );

    await expect(unit.commit()).rejects.toBeInstanceOf(Conflict);
    await expect(files.find(second)).resolves.toMatchObject({
      status: 'PENDING',
    });
  });

  it('should refuse to process a file twice', async () => {
    const account = await addAccount();
    const file = await pendingAvatar(account);
    await processAvatar(account, file);

    const unit = new DynamoUnitOfWork();
    unit.add(files.markProcessedOperation(file));

    await expect(unit.commit()).rejects.toBeInstanceOf(Conflict);
  });

  it('should fail only a pending file', async () => {
    const account = await addAccount();
    const pending = await pendingAvatar(account);
    const processed = await pendingAvatar(account);
    await processAvatar(account, processed);

    pending.fail(7);
    await files.markFailed(pending);
    processed.fail(7);
    await files.markFailed(processed);

    await expect(files.find(pending)).resolves.toMatchObject({
      status: 'FAILED',
      size: 7,
    });
    await expect(files.find(processed)).resolves.toMatchObject({
      status: 'PROCESSED',
    });
  });
});

describe('DynamoFileRepository with lesson material', () => {
  const lessonId = () => anAccountId() as string;
  const material = (ownerId: string, position: number) =>
    File.create({
      ownerId,
      purpose: 'attachment',
      contentType: 'application/pdf',
      name: `Part ${String(position)}.pdf`,
      position,
    });

  it('should list the files of a lesson, without pending ones that expired', async () => {
    const lesson = lessonId();
    const kept = material(lesson, 0);
    const expired = material(lesson, 1);
    await files.create(kept);
    await files.create(expired);
    await setFileFields(expired, {
      expiresAt: Math.floor(Date.now() / 1000) - 60,
    });

    const listed = await files.listByOwner(
      { ownerType: 'lesson', ownerId: lesson },
      'attachment',
    );

    expect(listed.map((file) => file.id)).toEqual([kept.id]);
  });

  it('should confirm a pending file once, reorder it and delete it', async () => {
    const lesson = lessonId();
    const file = material(lesson, 0);
    await files.create(file);

    file.markUploaded(42);
    await files.markUploaded(file);
    await files.markUploaded(file);
    const unit = new DynamoUnitOfWork();
    unit.add(files.setPositionOperation(file, 5));
    await unit.commit();

    await expect(files.find(file)).resolves.toMatchObject({
      status: 'UPLOADED',
      size: 42,
      position: 5,
    });
    await expect(files.delete(file)).resolves.toBe(true);
    await expect(files.delete(file)).resolves.toBe(false);
  });

  it('should refuse to reorder a file that was never sent', async () => {
    const file = material(lessonId(), 0);
    await files.create(file);

    const unit = new DynamoUnitOfWork();
    unit.add(files.setPositionOperation(file, 1));

    await expect(unit.commit()).rejects.toBeInstanceOf(Conflict);
  });

  it('should delete every file of a lesson, pending ones too, and nothing else in its partition', async () => {
    const lesson = lessonId();
    const sent = material(lesson, 0);
    await files.create(sent);
    sent.markUploaded(1);
    await files.markUploaded(sent);
    await files.create(material(lesson, 1));
    const body = { PK: `LESSON#${lesson}`, SK: 'CONTENT' };
    await dynamoClient.send(
      new PutCommand({ TableName: config.mainTableName, Item: body }),
    );
    const other = material(lessonId(), 0);
    await files.create(other);

    await files.deleteByOwner({ ownerType: 'lesson', ownerId: lesson });

    await expect(
      files.listByOwner({ ownerType: 'lesson', ownerId: lesson }, 'attachment'),
    ).resolves.toEqual([]);
    const { Item } = await dynamoClient.send(
      new GetCommand({ TableName: config.mainTableName, Key: body }),
    );
    expect(Item).toEqual(body);
    await expect(files.find(other)).resolves.toEqual(other);
  });
});
