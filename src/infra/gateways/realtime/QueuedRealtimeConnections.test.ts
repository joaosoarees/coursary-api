import KSUID from 'ksuid';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Lesson } from '@application/entities/outline/Lesson';
import type { RealtimeQueue } from '@application/gateways/realtime/RealtimeQueue';
import { QueuedRealtimeConnections } from '@infra/gateways/realtime/QueuedRealtimeConnections';

const accountId = Account.toId(KSUID.randomSync().string);
const courseId = Course.toId(KSUID.randomSync().string);
const lessonId = Lesson.toId(KSUID.randomSync().string);

const queueThat = (enqueue: RealtimeQueue['enqueue']) => {
  const enqueuing = vi.fn(enqueue);

  return { queue: { enqueue: enqueuing }, enqueuing };
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('QueuedRealtimeConnections', () => {
  it('should ask the queue to close an account, a course of it, or a lesson', async () => {
    const { queue, enqueuing } = queueThat(() => Promise.resolve());
    const connections = new QueuedRealtimeConnections(queue);

    await connections.closeForAccount({ accountId, courseId });
    await connections.closeForAccount({ accountId });
    await connections.closeForLesson(lessonId);

    expect(enqueuing.mock.calls).toEqual([
      [[{ closeAccount: { accountId, courseId } }]],
      [[{ closeAccount: { accountId } }]],
      [[{ closeLesson: lessonId }]],
    ]);
  });

  it('should not throw when the queue refuses, so the change that ended the access stays', async () => {
    const { queue } = queueThat(() =>
      Promise.reject(new Error('AccessDenied')),
    );
    const connections = new QueuedRealtimeConnections(queue);

    await expect(
      connections.closeForAccount({ accountId }),
    ).resolves.toBeUndefined();
    await expect(connections.closeForLesson(lessonId)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});
