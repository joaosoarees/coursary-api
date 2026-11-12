import { createHash, randomBytes } from 'node:crypto';

import type { Account } from '@application/entities/account/Account';
import type { RealtimeLesson } from '@application/entities/realtime/RealtimeLesson';

export class RealtimeTicket {
  static readonly lifetimeSeconds = 30;

  readonly hash: string;
  readonly accountId: Account.Id;
  readonly lesson: RealtimeLesson | undefined;
  readonly expiresAt: Date;

  constructor(attributes: RealtimeTicket.Attributes) {
    this.hash = attributes.hash;
    this.accountId = attributes.accountId;
    this.lesson = attributes.lesson;
    this.expiresAt = attributes.expiresAt;
  }

  // TTL removes an expired ticket days later: until then it is still in the table.
  isExpiredAt(now: Date): boolean {
    return now.getTime() >= this.expiresAt.getTime();
  }

  // Only the hash is stored, so a ticket read from the table cannot be used.
  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  static issue({
    accountId,
    lesson,
    now = new Date(),
  }: {
    accountId: Account.Id;
    lesson: RealtimeLesson | undefined;
    now?: Date;
  }): RealtimeTicket.Issued {
    const token = randomBytes(32).toString('base64url');
    const ticket = new RealtimeTicket({
      hash: RealtimeTicket.hashToken(token),
      accountId,
      lesson,
      // Whole seconds, as the table keeps it for the TTL.
      expiresAt: new Date(
        (Math.floor(now.getTime() / 1000) + RealtimeTicket.lifetimeSeconds) *
          1000,
      ),
    });

    return { ticket, token };
  }
}

export namespace RealtimeTicket {
  export interface Attributes {
    hash: string;
    accountId: Account.Id;
    lesson: RealtimeLesson | undefined;
    expiresAt: Date;
  }

  export interface Issued {
    ticket: RealtimeTicket;
    token: string;
  }
}
