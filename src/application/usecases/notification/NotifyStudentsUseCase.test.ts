import { beforeEach, describe, expect, it, vi } from 'vitest';

import { notifyWorld } from '@tests/support/notifyWorld';

import { NotifyStudentsUseCase } from '@application/usecases/notification/NotifyStudentsUseCase';

let world: Awaited<ReturnType<typeof notifyWorld>>;

const notify = (
  input: Parameters<NotifyStudentsUseCase['execute']>[0],
  pageSize = 100,
) =>
  new NotifyStudentsUseCase(
    world.courses,
    world.outline,
    world.students,
    world.notifications,
    world.notificationQueue,
    pageSize,
  ).execute(input);

const occurredAt = '2026-11-12T12:00:00.000Z';

beforeEach(async () => {
  world = await notifyWorld();
});

describe('NotifyStudentsUseCase', () => {
  it('should tell every active student of a new lesson, one page at a time', async () => {
    const classmate = await world.enroll('eva');
    const lesson = {
      kind: 'lesson' as const,
      courseId: world.course.id,
      lessonId: world.lesson.id,
      occurredAt,
    };

    await expect(notify(lesson, 1)).resolves.toHaveLength(1);
    const [next] = world.enqueued;
    expect(next).toMatchObject(lesson);
    expect(next).toHaveProperty('cursor');

    await expect(notify(next as typeof lesson, 1)).resolves.toHaveLength(1);

    for (const student of [world.student, classmate]) {
      await expect(world.inbox(student)).resolves.toMatchObject([
        { kind: 'lesson', lessonTitle: 'L0', courseTitle: 'T' },
      ]);
    }
  });

  it('should tell no one of a lesson in a draft, nor of an archive that is not one', async () => {
    await world.setCourse({ status: 'DRAFT' });

    await expect(
      notify({
        kind: 'lesson',
        courseId: world.course.id,
        lessonId: world.lesson.id,
        occurredAt,
      }),
    ).resolves.toEqual([]);

    await world.setCourse({ status: 'PUBLISHED' });

    await expect(
      notify({ kind: 'archived', courseId: world.course.id, occurredAt }),
    ).resolves.toEqual([]);
  });

  it('should tell the students their course was archived, once', async () => {
    await world.setCourse({ status: 'ARCHIVED' });
    const archived = {
      kind: 'archived' as const,
      courseId: world.course.id,
      occurredAt,
    };

    await expect(notify(archived)).resolves.toHaveLength(1);
    await expect(notify(archived)).resolves.toEqual([]);
    await expect(world.inbox(world.student)).resolves.toMatchObject([
      { kind: 'archived', courseTitle: 'T' },
    ]);
  });

  it('should read the outline strongly, to see the lesson just written', async () => {
    const read = vi.spyOn(world.outline, 'execute');

    await notify({
      kind: 'lesson',
      courseId: world.course.id,
      lessonId: world.lesson.id,
      occurredAt,
    });

    expect(read).toHaveBeenCalledWith(world.course.id, { consistent: true });
  });
});
