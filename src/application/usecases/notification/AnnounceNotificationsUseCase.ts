import type { Notification } from '@application/entities/notification/Notification';
import type { RealtimeQueue } from '@application/gateways/realtime/RealtimeQueue';

// Only the notifications just written: a repeated event announces nothing.
export class AnnounceNotificationsUseCase {
  constructor(private readonly realtimeQueue: RealtimeQueue) {}

  async execute(notifications: Notification[]): Promise<void> {
    const accountIds = [
      ...new Set(notifications.map(({ accountId }) => accountId)),
    ];

    if (accountIds.length > 0) {
      await this.realtimeQueue.enqueue([{ accountIds }]);
    }
  }
}
