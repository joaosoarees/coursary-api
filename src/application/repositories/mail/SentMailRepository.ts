import type { Account } from '@application/entities/account/Account';

export interface SentMailRepository {
  claim: (
    claim: SentMailRepository.Claim,
  ) => Promise<SentMailRepository.Claimed>;

  markSent: (sent: SentMailRepository.Sent) => Promise<void>;
}

export namespace SentMailRepository {
  // The one list of domain e-mail kinds; the queue and the item take it from here.
  export type Kind = 'welcome' | 'course-archived';

  export interface Claim {
    accountId: Account.Id;
    kind: Kind;
    // What the e-mail is about, when one account can get it more than once (a course id).
    ref?: string;
    now: Date;
    leaseSeconds: number;
  }

  // `busy`: another attempt holds a claim that has not run out yet.
  export type Claimed = 'claimed' | 'sent' | 'busy';

  export interface Sent {
    accountId: Account.Id;
    kind: Kind;
    ref?: string;
    sesMessageId: string;
    sentAt: Date;
  }
}
