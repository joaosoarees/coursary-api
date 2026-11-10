import { beforeEach, describe, expect, it } from 'vitest';

import { questionWorld } from '@tests/support/questionWorld';

import type { Account } from '@application/entities/account/Account';
import type { Question } from '@application/entities/question/Question';
import { QuestionNotFound } from '@application/errors/question';
import { ListAnswersUseCase } from '@application/usecases/question/ListAnswersUseCase';

let world: Awaited<ReturnType<typeof questionWorld>>;

const list = (caller: Account, questionId: string) =>
  new ListAnswersUseCase(
    world.courses,
    world.enrollments,
    world.questions,
    world.questionAnswers,
  ).execute({
    callerId: caller.id,
    callerRole: caller.role,
    courseId: world.course.id,
    lessonId: world.lesson.id,
    questionId: questionId as Question.Id,
    limit: 20,
  });

beforeEach(async () => {
  world = await questionWorld();
});

describe('ListAnswersUseCase', () => {
  it("should list a question's answers oldest first, and only its own", async () => {
    const asked = await world.storeQuestion(1, 'Why?');
    const other = await world.storeQuestion(2, 'How?');
    const classmate = await world.enroll('eva');
    const first = await world.storeAnswer(asked, 3);
    const second = await world.storeAnswer(asked, 4, classmate);
    await world.storeAnswer(other, 5);

    const { items } = await list(world.student, asked.id);

    expect(items.map((item) => item.id)).toEqual([first.id, second.id]);
    expect(items.map((item) => item.byInstructor)).toEqual([true, false]);
    expect(items.map((item) => item.canDelete)).toEqual([false, false]);
  });

  it('should refuse a question that is not in the lesson', async () => {
    await expect(
      list(world.student, '2HZXtsyCWqKbYadQSGc1G5hSJPo'),
    ).rejects.toThrow(QuestionNotFound);
  });
});
