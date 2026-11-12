import { beforeEach, describe, expect, it } from 'vitest';

import { notifyWorld } from '@tests/support/notifyWorld';

import { Question } from '@application/entities/question/Question';
import { NotifyQuestionUseCase } from '@application/usecases/notification/NotifyQuestionUseCase';

let world: Awaited<ReturnType<typeof notifyWorld>>;

beforeEach(async () => {
  world = await notifyWorld();
});

describe('NotifyQuestionUseCase', () => {
  it("should tell the course's instructor of a new question", async () => {
    const question = await world.ask();

    await new NotifyQuestionUseCase(
      world.questions,
      world.courses,
      world.outline,
      world.notifications,
    ).execute({
      kind: 'question',
      lessonId: world.lesson.id,
      questionId: Question.toId(question.id),
    });

    await expect(world.inbox(world.owner)).resolves.toMatchObject([
      {
        kind: 'question',
        lessonTitle: 'L0',
        questionId: Question.toId(question.id),
        actorName: world.student.name,
        byInstructor: false,
      },
    ]);
  });
});
