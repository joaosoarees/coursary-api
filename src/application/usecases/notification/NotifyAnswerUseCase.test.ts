import { beforeEach, describe, expect, it } from 'vitest';

import { notifyWorld } from '@tests/support/notifyWorld';

import type { Answer } from '@application/entities/question/Answer';
import type { Question } from '@application/entities/question/Question';
import { NotifyAnswerUseCase } from '@application/usecases/notification/NotifyAnswerUseCase';

let world: Awaited<ReturnType<typeof notifyWorld>>;

const notify = (questionId: string, answerId: string) =>
  new NotifyAnswerUseCase(
    world.questions,
    world.courses,
    world.outline,
    world.notifications,
  ).execute({
    kind: 'answer',
    lessonId: world.lesson.id,
    questionId: questionId as Question.Id,
    answerId: answerId as Answer.Id,
  });

beforeEach(async () => {
  world = await notifyWorld();
});

describe('NotifyAnswerUseCase', () => {
  it("should tell the question's author of the instructor's answer, once", async () => {
    const question = await world.ask();
    const answer = await world.answer(question.id);

    await expect(notify(question.id, answer.id)).resolves.toHaveLength(1);
    await expect(notify(question.id, answer.id)).resolves.toEqual([]);

    await expect(world.inbox(world.student)).resolves.toMatchObject([
      {
        kind: 'answer',
        courseTitle: 'T',
        lessonTitle: 'L0',
        questionId: question.id,
        actorName: world.owner.name,
        byInstructor: true,
      },
    ]);
  });

  it('should tell no one of an answer the author gave to their own question', async () => {
    const question = await world.ask();
    const answer = await world.answer(question.id, world.student);

    await expect(notify(question.id, answer.id)).resolves.toEqual([]);
    await expect(world.inbox(world.student)).resolves.toEqual([]);
  });
});
