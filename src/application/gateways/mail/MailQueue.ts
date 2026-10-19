import type { Account } from '@application/entities/account/Account';

// Asks for a domain e-mail to be sent; one queue for every kind (Q302, Q349).
export interface MailQueue {
  enqueue: (requests: MailQueue.Request[]) => Promise<void>;
}

export namespace MailQueue {
  export interface Request {
    kind: 'welcome';
    accountId: Account.Id;
  }
}
