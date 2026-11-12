import type { Account } from '@application/entities/account/Account';
import type { RealtimeLesson } from '@application/entities/realtime/RealtimeLesson';

export class RealtimeConnection {
  // API Gateway closes every connection at two hours; the rest is margin for the clock.
  static readonly lifetimeSeconds = 2 * 60 * 60 + 15 * 60;

  readonly id: RealtimeConnection.Id;
  readonly apiId: string;
  readonly accountId: Account.Id;
  readonly lesson: RealtimeLesson | undefined;
  readonly expiresAt: Date;

  constructor(attributes: RealtimeConnection.Attributes) {
    this.id = attributes.id;
    this.apiId = attributes.apiId;
    this.accountId = attributes.accountId;
    this.lesson = attributes.lesson;
    this.expiresAt = attributes.expiresAt;
  }

  // API Gateway's id is opaque: only its presence is checked.
  static toId(value: string): RealtimeConnection.Id {
    if (value === '') {
      throw new TypeError('Not a connection id: an empty string');
    }

    return value as RealtimeConnection.Id;
  }

  static open({
    id,
    apiId,
    accountId,
    lesson,
    connectedAt,
  }: {
    id: RealtimeConnection.Id;
    apiId: string;
    accountId: Account.Id;
    lesson: RealtimeLesson | undefined;
    connectedAt: Date;
  }): RealtimeConnection {
    return new RealtimeConnection({
      id,
      apiId,
      accountId,
      lesson,
      expiresAt: new Date(
        (Math.floor(connectedAt.getTime() / 1000) +
          RealtimeConnection.lifetimeSeconds) *
          1000,
      ),
    });
  }
}

export namespace RealtimeConnection {
  export type Id = string & { readonly __brand: 'RealtimeConnection.Id' };

  export interface Attributes {
    id: Id;
    apiId: string;
    accountId: Account.Id;
    lesson: RealtimeLesson | undefined;
    expiresAt: Date;
  }
}
