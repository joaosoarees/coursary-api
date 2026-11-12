import type { Account } from '@application/entities/account/Account';
import type { Notification } from '@application/entities/notification/Notification';
import { NotificationNotFound } from '@application/errors/notification';
import type { NotificationRepository } from '@application/repositories/notification/NotificationRepository';

export class MarkNotificationReadUseCase {
  constructor(
    private readonly notificationsRepository: NotificationRepository,
  ) {}

  // The key holds the caller's account: someone else's notification is not found.
  async execute({
    accountId,
    notificationId,
  }: {
    accountId: Account.Id;
    notificationId: Notification.Id;
  }): Promise<void> {
    const marked = await this.notificationsRepository.markRead(
      accountId,
      notificationId,
      new Date(),
    );

    if (!marked) {
      throw new NotificationNotFound();
    }
  }
}
