import KSUID from 'ksuid';
import { beforeEach, describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import type { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Notification } from '@application/entities/notification/Notification';
import { DynamoNotificationRepository } from '@infra/database/dynamo/repositories/notification/DynamoNotificationRepository';
import { AppConfig } from '@shared/config/AppConfig';

const notifications = new DynamoNotificationRepository(new AppConfig());
const courseId = Course.toId(KSUID.randomSync().string);
const DAY = 24 * 60 * 60 * 1000;
let accountId: Account.Id;

const notice = (sourceId: string, occurredAt = new Date()) =>
  Notification.create({
    accountId,
    kind: 'question',
    courseId,
    courseTitle: 'DynamoDB',
    lessonId: undefined,
    lessonTitle: undefined,
    questionId: undefined,
    actorName: 'Bia',
    byInstructor: false,
    sourceId,
    occurredAt,
  });

const store = async (count: number) => {
  for (let i = 0; i < count; i++) {
    await notifications.saveIfNew(notice(`q-${String(i)}`));
  }
};

beforeEach(() => {
  accountId = anAccountId();
});

describe('DynamoNotificationRepository', () => {
  it('should store the same event once', async () => {
    await expect(notifications.saveIfNew(notice('q-1'))).resolves.toBe(true);
    await expect(notifications.saveIfNew(notice('q-1'))).resolves.toBe(false);

    await expect(
      notifications.countUnread(accountId, new Date(), 100),
    ).resolves.toBe(1);
  });

  it('should stop counting at the cap and leave expired ones out', async () => {
    await store(3);
    await notifications.saveIfNew(
      notice('old', new Date(Date.now() - 91 * DAY)),
    );

    await expect(
      notifications.countUnread(accountId, new Date(), 100),
    ).resolves.toBe(3);
    await expect(
      notifications.countUnread(accountId, new Date(), 2),
    ).resolves.toBe(2);
  });

  it('should mark one read once, and not one the account does not have', async () => {
    const first = notice('q-1');
    await notifications.saveIfNew(first);

    await expect(
      notifications.markRead(accountId, first.id, new Date()),
    ).resolves.toBe(true);
    await expect(
      notifications.markRead(accountId, first.id, new Date()),
    ).resolves.toBe(true);
    await expect(
      notifications.markRead(anAccountId(), first.id, new Date()),
    ).resolves.toBe(false);
    await expect(
      notifications.countUnread(accountId, new Date(), 100),
    ).resolves.toBe(0);
  });

  it('should mark up to the maximum read at once', async () => {
    await store(5);

    await expect(
      notifications.markAllRead(accountId, new Date(), 3),
    ).resolves.toBe(3);
    await expect(
      notifications.countUnread(accountId, new Date(), 100),
    ).resolves.toBe(2);
    await expect(
      notifications.markAllRead(accountId, new Date(), 1000),
    ).resolves.toBe(2);
  });
});
