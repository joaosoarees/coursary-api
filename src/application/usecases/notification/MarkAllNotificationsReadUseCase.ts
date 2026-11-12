import type { Account } from '@application/entities/account/Account';
import type { NotificationRepository } from '@application/repositories/notification/NotificationRepository';

export class MarkAllNotificationsReadUseCase {
  // Well within the 30 seconds of an HTTP API call; the 90-day TTL keeps an inbox near it.
  static readonly maxPerCall = 1000;

  constructor(
    private readonly notificationsRepository: NotificationRepository,
  ) {}

  async execute({
    accountId,
  }: {
    accountId: Account.Id;
  }): Promise<{ marked: number }> {
    const marked = await this.notificationsRepository.markAllRead(
      accountId,
      new Date(),
      MarkAllNotificationsReadUseCase.maxPerCall,
    );

    return { marked };
  }
}
