import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';
import { RealtimeTicket } from '@application/entities/realtime/RealtimeTicket';
import { nowInSeconds } from '@infra/database/dynamo/ttl';

export class RealtimeTicketItem {
  static readonly type = 'RealtimeTicket';

  private readonly keys: RealtimeTicketItem.Keys;

  constructor(private readonly attributes: RealtimeTicketItem.Attributes) {
    this.keys = {
      PK: RealtimeTicketItem.getPK(attributes.hash),
      SK: RealtimeTicketItem.getSK(attributes.hash),
    };
  }

  toItem(): RealtimeTicketItem.ItemType {
    return { ...this.keys, ...this.attributes, type: RealtimeTicketItem.type };
  }

  static fromEntity(ticket: RealtimeTicket): RealtimeTicketItem {
    return new RealtimeTicketItem({
      hash: ticket.hash,
      accountId: ticket.accountId,
      ...ticket.lesson,
      expiresAt: nowInSeconds(ticket.expiresAt.getTime()),
    });
  }

  static toEntity(item: RealtimeTicketItem.ItemType): RealtimeTicket {
    return new RealtimeTicket({
      hash: item.hash,
      accountId: item.accountId,
      lesson:
        item.courseId && item.lessonId
          ? { courseId: item.courseId, lessonId: item.lessonId }
          : undefined,
      expiresAt: new Date(item.expiresAt * 1000),
    });
  }

  static getPK(hash: string): RealtimeTicketItem.Keys['PK'] {
    return `TICKET#${hash}`;
  }

  static getSK(hash: string): RealtimeTicketItem.Keys['SK'] {
    return `TICKET#${hash}`;
  }
}

export namespace RealtimeTicketItem {
  export interface Keys {
    PK: `TICKET#${string}`;
    SK: `TICKET#${string}`;
  }

  export interface Attributes {
    hash: string;
    accountId: Account.Id;
    courseId?: Course.Id;
    lessonId?: Lesson.Id;
    expiresAt: number;
  }

  export type ItemType = Keys & Attributes & { type: 'RealtimeTicket' };
}
