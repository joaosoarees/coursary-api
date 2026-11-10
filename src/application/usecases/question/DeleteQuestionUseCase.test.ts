import { beforeEach, describe, expect, it } from 'vitest';

import { questionWorld } from '@tests/support/questionWorld';

import type { Account } from '@application/entities/account/Account';
import type { Question } from '@application/entities/question/Question';
import { Forbidden } from '@application/errors/common';
import { QuestionNotFound } from '@application/errors/question';
import { DeleteQuestionUseCase } from '@application/usecases/question/DeleteQuestionUseCase';

let world: Awaited<ReturnType<typeof questionWorld>>;

const remove = (questionId: string, caller: Account) =>
  new DeleteQuestionUseCase(
    world.courses,
    world.enrollments,
    world.questions,
  ).execute({
    callerId: caller.id,
    callerRole: caller.role,
    courseId: world.course.id,
    lessonId: world.lesson.id,
    questionId: questionId as Question.Id,
  });

beforeEach(async () => {
  world = await questionWorld();
});

describe('DeleteQuestionUseCase', () => {
  it('should let the author delete an unanswered question outright', async () => {
    const asked = await world.ask();

    await remove(asked.id, world.student);

    await expect(world.stored(asked.id)).resolves.toBeNull();
  });

  it('should keep an answered question removed when the owner or an admin deletes it', async () => {
    const byOwner = await world.ask();
    const byAdmin = await world.ask();
    await world.answer(byOwner.id);
    await world.answer(byAdmin.id);

    await remove(byOwner.id, world.owner);
    await remove(byAdmin.id, world.admin);

    await expect(world.stored(byOwner.id)).resolves.toMatchObject({
      removed: true,
      text: '',
    });
    await expect(world.stored(byAdmin.id)).resolves.toMatchObject({
      removed: true,
    });
  });

  it('should refuse another student and a question already removed', async () => {
    const asked = await world.ask();
    await world.answer(asked.id);
    const classmate = await world.enroll('eva');

    await expect(remove(asked.id, classmate)).rejects.toThrow(Forbidden);

    await remove(asked.id, world.student);

    await expect(remove(asked.id, world.student)).rejects.toThrow(
      QuestionNotFound,
    );
  });
});
