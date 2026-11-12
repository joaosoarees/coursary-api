import type { Page } from '@application/contracts/Page';
import type { Account } from '@application/entities/account/Account';
import type { ListNotificationsQuery } from '@application/queries/notification/ListNotificationsQuery';
import { NotificationSummary } from '@application/queries/notification/NotificationSummary';
import type { NotificationRepository } from '@application/repositories/notification/NotificationRepository';

export class ListNotificationsUseCase {
  // The bell shows "99+" above 99: counting further reads for nothing.
  static readonly unreadCap = 100;

  constructor(
    private readonly listNotifications: ListNotificationsQuery,
    private readonly notificationsRepository: NotificationRepository,
  ) {}

  async execute({
    accountId,
    limit,
    cursor,
    now = new Date(),
  }: ListNotificationsUseCase.Input): Promise<ListNotificationsUseCase.Output> {
    const [{ items, nextCursor }, unreadCount] = await Promise.all([
      this.listNotifications.execute({
        accountId,
        now,
        page: { limit, cursor },
      }),
      this.notificationsRepository.countUnread(
        accountId,
        now,
        ListNotificationsUseCase.unreadCap,
      ),
    ]);

    return {
      items: items.map((item) => NotificationSummary.fromNotification(item)),
      nextCursor,
      unreadCount,
    };
  }
}

export namespace ListNotificationsUseCase {
  export interface Input extends Page.Options {
    accountId: Account.Id;
    now?: Date;
  }

  export interface Output extends Page<NotificationSummary> {
    unreadCount: number;
  }
}
