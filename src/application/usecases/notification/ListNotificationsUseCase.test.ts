import { beforeEach, describe, expect, it } from 'vitest';

import { notificationWorld } from '@tests/support/notificationWorld';

import { ListNotificationsUseCase } from '@application/usecases/notification/ListNotificationsUseCase';

let world: ReturnType<typeof notificationWorld>;

const list = (limit = 20, cursor?: string) =>
  new ListNotificationsUseCase(
    world.listNotifications,
    world.notifications,
  ).execute({ accountId: world.accountId, limit, cursor });

beforeEach(() => {
  world = notificationWorld();
});

describe('ListNotificationsUseCase', () => {
  it('should list newest first, page by page, with the unread count', async () => {
    const ids = (await world.store(3)).map(({ id }) => id);
    const newest = await world.storeOne('q-new');
    await world.notifications.markRead(world.accountId, newest.id, new Date());

    const page = await list(2);
    const rest = await list(2, page.nextCursor ?? undefined);

    expect(page).toMatchObject({
      items: [
        { id: newest.id, read: true },
        { id: ids[2], read: false, kind: 'question', actorName: 'Bia' },
      ],
      unreadCount: 3,
    });
    expect(rest.items.map(({ id }) => id)).toEqual([ids[1], ids[0]]);
    expect(rest.nextCursor).toBeNull();
  });

  it('should leave the expired ones out', async () => {
    await world.notifications.saveIfNew(
      world.notice('old', new Date(Date.now() - 91 * 24 * 60 * 60 * 1000)),
    );

    await expect(list()).resolves.toEqual({
      items: [],
      nextCursor: null,
      unreadCount: 0,
    });
  });
});
