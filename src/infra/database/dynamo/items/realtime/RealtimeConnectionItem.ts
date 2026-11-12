import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';
import { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';
import { nowInSeconds } from '@infra/database/dynamo/ttl';

// Found by its id on $disconnect and GoneException, by the lesson through GSI1 to push (only a
// connection to a lesson has those keys), and by the account through GSI2 to push and close.
export class RealtimeConnectionItem {
  static readonly type = 'RealtimeConnection';

  private readonly keys: RealtimeConnectionItem.Keys;

  constructor(private readonly attributes: RealtimeConnectionItem.Attributes) {
    this.keys = {
      PK: RealtimeConnectionItem.getPK(attributes.id),
      SK: RealtimeConnectionItem.getSK(attributes.id),
      ...(attributes.lessonId
        ? {
            GSI1PK: RealtimeConnectionItem.getGSI1PK(attributes.lessonId),
            GSI1SK: RealtimeConnectionItem.getSK(attributes.id),
          }
        : {}),
      GSI2PK: RealtimeConnectionItem.getGSI2PK(attributes.accountId),
      GSI2SK: RealtimeConnectionItem.getSK(attributes.id),
    };
  }

  toItem(): RealtimeConnectionItem.ItemType {
    return {
      ...this.keys,
      ...this.attributes,
      type: RealtimeConnectionItem.type,
    };
  }

  static fromEntity(connection: RealtimeConnection): RealtimeConnectionItem {
    return new RealtimeConnectionItem({
      id: connection.id,
      apiId: connection.apiId,
      accountId: connection.accountId,
      ...connection.lesson,
      expiresAt: nowInSeconds(connection.expiresAt.getTime()),
    });
  }

  static toEntity(item: RealtimeConnectionItem.ItemType): RealtimeConnection {
    return new RealtimeConnection({
      id: item.id,
      apiId: item.apiId,
      accountId: item.accountId,
      lesson:
        item.courseId && item.lessonId
          ? { courseId: item.courseId, lessonId: item.lessonId }
          : undefined,
      expiresAt: new Date(item.expiresAt * 1000),
    });
  }

  static getPK(id: RealtimeConnection.Id): RealtimeConnectionItem.Keys['PK'] {
    return `CONNECTION#${id}`;
  }

  static getSK(id: RealtimeConnection.Id): RealtimeConnectionItem.Keys['SK'] {
    return `CONNECTION#${id}`;
  }

  static getGSI1PK(
    lessonId: Lesson.Id,
  ): NonNullable<RealtimeConnectionItem.Keys['GSI1PK']> {
    return `REALTIME#LESSON#${lessonId}`;
  }

  static getGSI2PK(
    accountId: Account.Id,
  ): RealtimeConnectionItem.Keys['GSI2PK'] {
    return `REALTIME#ACCOUNT#${accountId}`;
  }
}

export namespace RealtimeConnectionItem {
  export interface Keys {
    PK: `CONNECTION#${string}`;
    SK: `CONNECTION#${string}`;
    GSI1PK?: `REALTIME#LESSON#${string}`;
    GSI1SK?: `CONNECTION#${string}`;
    GSI2PK: `REALTIME#ACCOUNT#${string}`;
    GSI2SK: `CONNECTION#${string}`;
  }

  export interface Attributes {
    id: RealtimeConnection.Id;
    apiId: string;
    accountId: Account.Id;
    courseId?: Course.Id;
    lessonId?: Lesson.Id;
    expiresAt: number;
  }

  export type ItemType = Keys & Attributes & { type: 'RealtimeConnection' };
}
