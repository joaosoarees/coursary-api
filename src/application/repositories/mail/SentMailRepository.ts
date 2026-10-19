import type { Account } from '@application/entities/account/Account';

// The claim that sends each domain e-mail once per account (Q350).
export interface SentMailRepository {
  claim: (
    claim: SentMailRepository.Claim,
  ) => Promise<SentMailRepository.Claimed>;

  markSent: (sent: SentMailRepository.Sent) => Promise<void>;
}

export namespace SentMailRepository {
  export type Kind = 'welcome';

  export interface Claim {
    accountId: Account.Id;
    kind: Kind;
    now: Date;
    leaseSeconds: number;
  }

  // `busy`: another attempt holds a claim that has not run out yet.
  export type Claimed = 'claimed' | 'sent' | 'busy';

  export interface Sent {
    accountId: Account.Id;
    kind: Kind;
    sesMessageId: string;
    sentAt: Date;
  }
}
