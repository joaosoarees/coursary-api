import type { Account } from '@application/entities/account/Account';
import type { Notification } from '@application/entities/notification/Notification';

export interface NotificationRepository {
  // false: it was already there, from an earlier delivery of the same event.
  saveIfNew: (notification: Notification) => Promise<boolean>;

  // false: the account has no such notification. Marking twice keeps the first time.
  markRead: (
    accountId: Account.Id,
    id: Notification.Id,
    now: Date,
  ) => Promise<boolean>;

  // Up to `max` of them; returns how many were marked.
  markAllRead: (
    accountId: Account.Id,
    now: Date,
    max: number,
  ) => Promise<number>;

  // Stops counting at `cap`.
  countUnread: (
    accountId: Account.Id,
    now: Date,
    cap: number,
  ) => Promise<number>;
}
