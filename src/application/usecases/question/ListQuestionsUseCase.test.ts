import { beforeEach, describe, expect, it } from 'vitest';

import { questionWorld } from '@tests/support/questionWorld';

import type { Account } from '@application/entities/account/Account';
import { Forbidden } from '@application/errors/common';
import { ListQuestionsUseCase } from '@application/usecases/question/ListQuestionsUseCase';

let world: Awaited<ReturnType<typeof questionWorld>>;

const list = (caller: Account, limit = 20, cursor?: string) =>
  new ListQuestionsUseCase(
    world.courses,
    world.enrollments,
    world.lessons,
    world.lessonQuestions,
  ).execute({
    callerId: caller.id,
    callerRole: caller.role,
    courseId: world.course.id,
    lessonId: world.lesson.id,
    limit,
    cursor,
  });

beforeEach(async () => {
  world = await questionWorld();
});

describe('ListQuestionsUseCase', () => {
  it('should list the questions newest first, page by page', async () => {
    const first = await world.storeQuestion(1, 'First');
    const second = await world.storeQuestion(2, 'Second');
    const third = await world.storeQuestion(3, 'Third');

    const page = await list(world.student, 2);
    const rest = await list(world.student, 2, page.nextCursor ?? undefined);

    expect(page.items.map((item) => item.id)).toEqual([third.id, second.id]);
    expect(rest).toMatchObject({ items: [{ id: first.id }], nextCursor: null });
  });

  it('should tell each caller what they may delete', async () => {
    await world.ask();
    const classmate = await world.enroll('eva');

    await expect(list(world.student)).resolves.toMatchObject({
      items: [{ canDelete: true }],
    });
    await expect(list(classmate)).resolves.toMatchObject({
      items: [{ canDelete: false }],
    });
    await expect(list(world.owner)).resolves.toMatchObject({
      items: [{ canDelete: true }],
    });
  });

  it('should let enrolled students read an archived course and refuse a stranger', async () => {
    await world.ask();
    await world.setCourse({ status: 'ARCHIVED' });

    await expect(list(world.student)).resolves.toMatchObject({
      items: [{ text: 'Why?' }],
    });
    await expect(list(world.other)).rejects.toThrow(Forbidden);
  });
});
