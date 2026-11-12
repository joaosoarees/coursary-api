import { beforeEach, describe, expect, it } from 'vitest';

import { realtimeWorld } from '@tests/support/realtimeWorld';

import type { Account } from '@application/entities/account/Account';
import { Lesson } from '@application/entities/outline/Lesson';
import { Forbidden } from '@application/errors/common';
import { CourseNotFound } from '@application/errors/course';
import { LessonNotFound } from '@application/errors/outline';
import { IssueRealtimeTicketUseCase } from '@application/usecases/realtime/IssueRealtimeTicketUseCase';

let world: Awaited<ReturnType<typeof realtimeWorld>>;

const issue = (caller: Account, lessonId: Lesson.Id | null = world.lesson.id) =>
  new IssueRealtimeTicketUseCase(
    world.courses,
    world.enrollments,
    world.lessons,
    world.tickets,
  ).execute({
    callerId: caller.id,
    callerRole: caller.role,
    lesson: lessonId ? { courseId: world.course.id, lessonId } : undefined,
  });

beforeEach(async () => {
  world = await realtimeWorld();
});

describe('IssueRealtimeTicketUseCase', () => {
  it('should hand a reader of the lesson a ticket stored only by its hash', async () => {
    const { ticket, expiresAt } = await issue(world.student);
    const stored = await world.storedTicket(ticket);

    expect(Date.parse(expiresAt) - Date.now()).toBeGreaterThan(25_000);
    expect(stored).toMatchObject({
      accountId: world.student.id,
      courseId: world.course.id,
      lessonId: world.lesson.id,
    });
    expect(JSON.stringify(stored)).not.toContain(ticket);
  });

  it('should let the owner and an admin in, and keep an archived course open', async () => {
    await world.setCourse({ status: 'ARCHIVED' });

    await expect(issue(world.student)).resolves.toHaveProperty('ticket');
    await expect(issue(world.owner)).resolves.toHaveProperty('ticket');
    await expect(issue(world.admin)).resolves.toHaveProperty('ticket');
  });

  it('should refuse who may not read the lesson, a draft and an unknown lesson', async () => {
    await expect(issue(world.other)).rejects.toThrow(Forbidden);
    await expect(
      issue(world.student, Lesson.toId('2HZXtsyCWqKbYadQSGc1G5hSJPo')),
    ).rejects.toThrow(LessonNotFound);

    await world.setCourse({ status: 'DRAFT' });

    await expect(issue(world.owner)).rejects.toThrow(Forbidden);
    await expect(issue(world.student)).rejects.toThrow(CourseNotFound);
  });

  it('should give anyone signed in a ticket for their own news, with no lesson', async () => {
    const { ticket } = await issue(world.other, null);

    const stored = await world.storedTicket(ticket);
    expect(stored).toMatchObject({ accountId: world.other.id });
    expect(stored).not.toHaveProperty('lessonId');
  });
});
