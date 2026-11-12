import { beforeEach, describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';
import { notificationWorld } from '@tests/support/notificationWorld';

import { NotificationNotFound } from '@application/errors/notification';
import { MarkNotificationReadUseCase } from '@application/usecases/notification/MarkNotificationReadUseCase';

let world: ReturnType<typeof notificationWorld>;

beforeEach(() => {
  world = notificationWorld();
});

describe('MarkNotificationReadUseCase', () => {
  it("should mark the caller's notification and refuse anyone else's", async () => {
    const notification = await world.storeOne('q-1');
    const markRead = new MarkNotificationReadUseCase(world.notifications);

    await markRead.execute({
      accountId: world.accountId,
      notificationId: notification.id,
    });

    await expect(
      world.notifications.countUnread(world.accountId, new Date(), 100),
    ).resolves.toBe(0);
    await expect(
      markRead.execute({
        accountId: anAccountId(),
        notificationId: notification.id,
      }),
    ).rejects.toThrow(NotificationNotFound);
  });
});
