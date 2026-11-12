import { beforeEach, describe, expect, it } from 'vitest';

import { notificationWorld } from '@tests/support/notificationWorld';

import { MarkAllNotificationsReadUseCase } from '@application/usecases/notification/MarkAllNotificationsReadUseCase';

let world: ReturnType<typeof notificationWorld>;

beforeEach(() => {
  world = notificationWorld();
});

describe('MarkAllNotificationsReadUseCase', () => {
  it('should mark every unread notification and say how many', async () => {
    await world.store(3);

    await expect(
      new MarkAllNotificationsReadUseCase(world.notifications).execute({
        accountId: world.accountId,
      }),
    ).resolves.toEqual({ marked: 3 });
    await expect(
      world.notifications.countUnread(world.accountId, new Date(), 100),
    ).resolves.toBe(0);
  });
});
