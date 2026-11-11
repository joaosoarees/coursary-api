import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Lesson } from '@application/entities/outline/Lesson';
import { RealtimeTicket } from '@application/entities/realtime/RealtimeTicket';
import { RealtimeTicketItem } from '@infra/database/dynamo/items/realtime/RealtimeTicketItem';

describe('RealtimeTicketItem', () => {
  it('should key the ticket by its hash and expire it in epoch seconds', () => {
    const student = Account.create({ name: 'Bia', email: 'b@example.com' });
    const course = Course.create({ instructor: student, title: 'DynamoDB' });
    const { ticket } = RealtimeTicket.issue({
      accountId: student.id,
      courseId: course.id,
      lessonId: Lesson.toId('2HZXtsyCWqKbYadQSGc1G5hSJPo'),
      now: new Date('2026-11-11T12:00:00.000Z'),
    });

    const item = RealtimeTicketItem.fromEntity(ticket).toItem();

    expect(item).toMatchObject({
      PK: `TICKET#${ticket.hash}`,
      SK: `TICKET#${ticket.hash}`,
      type: 'RealtimeTicket',
      expiresAt: Date.parse('2026-11-11T12:00:30.000Z') / 1000,
    });
    expect(RealtimeTicketItem.toEntity(item)).toEqual(ticket);
  });
});
