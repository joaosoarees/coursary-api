import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Lesson } from '@application/entities/outline/Lesson';
import { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';

describe('RealtimeConnection', () => {
  it('should outlive the two hours API Gateway keeps it, on a whole second', () => {
    const student = Account.create({ name: 'Bia', email: 'bia@example.com' });

    const connection = RealtimeConnection.open({
      id: RealtimeConnection.toId('L0SM9cOFvHcCIhw='),
      apiId: 'abc123def4',
      accountId: student.id,
      courseId: Course.create({ instructor: student, title: 'T' }).id,
      lessonId: Lesson.toId('2HZXtsyCWqKbYadQSGc1G5hSJPo'),
      connectedAt: new Date('2026-11-11T12:00:00.700Z'),
    });

    expect(connection.expiresAt).toEqual(new Date('2026-11-11T14:15:00.000Z'));
  });

  it('should refuse an empty id', () => {
    expect(() => RealtimeConnection.toId('')).toThrow(TypeError);
  });
});
