import type { Account } from '@application/entities/account/Account';
import type { Lesson } from '@application/entities/outline/Lesson';

export class RealtimeConnection {
  // API Gateway closes every connection at two hours; the rest is margin for the clock.
  static readonly lifetimeSeconds = 2 * 60 * 60 + 15 * 60;

  readonly id: RealtimeConnection.Id;
  readonly apiId: string;
  readonly accountId: Account.Id;
  readonly lessonId: Lesson.Id;
  readonly expiresAt: Date;

  constructor(attributes: RealtimeConnection.Attributes) {
    this.id = attributes.id;
    this.apiId = attributes.apiId;
    this.accountId = attributes.accountId;
    this.lessonId = attributes.lessonId;
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
    lessonId,
    connectedAt,
  }: {
    id: RealtimeConnection.Id;
    apiId: string;
    accountId: Account.Id;
    lessonId: Lesson.Id;
    connectedAt: Date;
  }): RealtimeConnection {
    return new RealtimeConnection({
      id,
      apiId,
      accountId,
      lessonId,
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
    lessonId: Lesson.Id;
    expiresAt: Date;
  }
}
