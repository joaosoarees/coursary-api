import { beforeEach, describe, expect, it } from 'vitest';

import { questionWorld } from '@tests/support/questionWorld';

import type { Account } from '@application/entities/account/Account';
import type { Answer } from '@application/entities/question/Answer';
import type { Question } from '@application/entities/question/Question';
import { Forbidden } from '@application/errors/common';
import { DeleteAnswerUseCase } from '@application/usecases/question/DeleteAnswerUseCase';
import { DeleteQuestionUseCase } from '@application/usecases/question/DeleteQuestionUseCase';

let world: Awaited<ReturnType<typeof questionWorld>>;

const removeAnswer = (questionId: string, answerId: string, caller: Account) =>
  new DeleteAnswerUseCase(
    world.courses,
    world.enrollments,
    world.questions,
    world.unitOfWork,
  ).execute({
    callerId: caller.id,
    callerRole: caller.role,
    courseId: world.course.id,
    lessonId: world.lesson.id,
    questionId: questionId as Question.Id,
    answerId: answerId as Answer.Id,
  });

beforeEach(async () => {
  world = await questionWorld();
});

describe('DeleteAnswerUseCase', () => {
  it('should let the author delete an answer and take it off the count', async () => {
    const asked = await world.ask();
    const classmate = await world.enroll('eva');
    const answered = await world.answer(asked.id, classmate);
    await world.answer(asked.id);

    await removeAnswer(asked.id, answered.id, classmate);

    await expect(world.stored(asked.id)).resolves.toMatchObject({
      answerCount: 1,
    });
  });

  it('should refuse a student who did not write it', async () => {
    const asked = await world.ask();
    const answered = await world.answer(asked.id);

    await expect(
      removeAnswer(asked.id, answered.id, world.student),
    ).rejects.toThrow(Forbidden);
  });

  it('should take a removed question with its last answer', async () => {
    const asked = await world.ask();
    const answered = await world.answer(asked.id);
    await new DeleteQuestionUseCase(
      world.courses,
      world.enrollments,
      world.questions,
    ).execute({
      callerId: world.student.id,
      callerRole: world.student.role,
      courseId: world.course.id,
      lessonId: world.lesson.id,
      questionId: asked.id as Question.Id,
    });

    await removeAnswer(asked.id, answered.id, world.owner);

    await expect(world.stored(asked.id)).resolves.toBeNull();
  });
});
