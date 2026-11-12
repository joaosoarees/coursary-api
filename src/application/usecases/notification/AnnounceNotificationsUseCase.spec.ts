import KSUID from 'ksuid';
import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import type { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Notification } from '@application/entities/notification/Notification';
import type { RealtimeQueue } from '@application/gateways/realtime/RealtimeQueue';
import { AnnounceNotificationsUseCase } from '@application/usecases/notification/AnnounceNotificationsUseCase';

const courseId = Course.toId(KSUID.randomSync().string);

const notice = (accountId: Account.Id, sourceId: string) =>
  Notification.create({
    accountId,
    kind: 'archived',
    courseId,
    courseTitle: 'T',
    lessonId: undefined,
    lessonTitle: undefined,
    questionId: undefined,
    actorName: undefined,
    byInstructor: false,
    sourceId,
    occurredAt: new Date(),
  });

const announce = async (notifications: Notification[]) => {
  const sent: RealtimeQueue.Change[] = [];
  await new AnnounceNotificationsUseCase({
    enqueue: (changes) => {
      sent.push(...changes);

      return Promise.resolve();
    },
  }).execute(notifications);

  return sent;
};

describe('AnnounceNotificationsUseCase', () => {
  it('should name each account with new notifications once', async () => {
    const ana = anAccountId();
    const bia = anAccountId();

    await expect(
      announce([notice(ana, 'a'), notice(ana, 'b'), notice(bia, 'a')]),
    ).resolves.toEqual([{ accountIds: [ana, bia] }]);
  });

  it('should send nothing when nothing new was written', async () => {
    await expect(announce([])).resolves.toEqual([]);
  });
});
