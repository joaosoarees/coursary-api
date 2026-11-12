import type { Page } from '@application/contracts/Page';
import type { Account } from '@application/entities/account/Account';
import type { Notification } from '@application/entities/notification/Notification';

// Newest first, the expired ones left out.
export interface ListNotificationsQuery {
  execute: (input: ListNotificationsQuery.Input) => Promise<Page<Notification>>;
}

export namespace ListNotificationsQuery {
  export interface Input {
    accountId: Account.Id;
    now: Date;
    page: Page.Options;
  }
}
