import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Lesson } from '@application/entities/outline/Lesson';
import { RealtimeTicket } from '@application/entities/realtime/RealtimeTicket';

const student = Account.create({ name: 'Bia', email: 'bia@example.com' });
const course = Course.create({ instructor: student, title: 'T' });
const lessonId = Lesson.toId('2HZXtsyCWqKbYadQSGc1G5hSJPo');
const now = new Date('2026-11-11T12:00:00.000Z');

const issue = () =>
  RealtimeTicket.issue({
    accountId: student.id,
    courseId: course.id,
    lessonId,
    now,
  });

describe('RealtimeTicket', () => {
  it('should keep only the hash of the token it hands out', () => {
    const { ticket, token } = issue();

    expect(token).toMatch(/^[\w-]{43}$/);
    expect(ticket.hash).toBe(RealtimeTicket.hashToken(token));
    expect(ticket.hash).not.toContain(token);
    expect(issue().token).not.toBe(token);
  });

  it('should expire thirty seconds after it is issued', () => {
    const { ticket } = issue();

    expect(ticket.isExpiredAt(new Date(now.getTime() + 29_999))).toBe(false);
    expect(ticket.isExpiredAt(new Date(now.getTime() + 30_000))).toBe(true);
  });

  it('should count the thirty seconds from the whole second, as the table keeps it', () => {
    const { ticket } = RealtimeTicket.issue({
      accountId: student.id,
      courseId: course.id,
      lessonId,
      now: new Date('2026-11-11T12:00:00.700Z'),
    });

    expect(ticket.expiresAt).toEqual(new Date('2026-11-11T12:00:30.000Z'));
  });
});
