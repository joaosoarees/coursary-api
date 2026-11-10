import { beforeEach, describe, expect, it } from 'vitest';

import { questionWorld } from '@tests/support/questionWorld';

import { Forbidden } from '@application/errors/common';
import { CourseArchived } from '@application/errors/course';
import {
  QuestionNotFound,
  QuestionRemoved,
} from '@application/errors/question';

let world: Awaited<ReturnType<typeof questionWorld>>;

beforeEach(async () => {
  world = await questionWorld();
});

describe('AnswerQuestionUseCase', () => {
  it('should mark the owner answer as the instructor one and count both answers', async () => {
    const asked = await world.ask();
    const classmate = await world.enroll('eva');

    await expect(world.answer(asked.id)).resolves.toMatchObject({
      byInstructor: true,
      canDelete: true,
    });
    await expect(world.answer(asked.id, classmate)).resolves.toMatchObject({
      byInstructor: false,
    });
    await expect(world.stored(asked.id)).resolves.toMatchObject({
      answerCount: 2,
    });
  });

  it('should refuse someone neither enrolled nor the owner', async () => {
    const asked = await world.ask();

    await expect(world.answer(asked.id, world.other)).rejects.toThrow(
      Forbidden,
    );
  });

  it('should refuse an unknown question and a removed one', async () => {
    const asked = await world.ask();
    await world.answer(asked.id);
    const stored = await world.stored(asked.id);

    if (!stored) {
      throw new Error('The question was not stored.');
    }

    await world.questions.removeQuestion(stored, stored.remove());

    await expect(world.answer('2HZXtsyCWqKbYadQSGc1G5hSJPo')).rejects.toThrow(
      QuestionNotFound,
    );
    await expect(world.answer(asked.id)).rejects.toThrow(QuestionRemoved);
  });

  it('should refuse an answer in an archived course', async () => {
    const asked = await world.ask();
    await world.setCourse({ status: 'ARCHIVED' });

    await expect(world.answer(asked.id)).rejects.toThrow(CourseArchived);
  });
});
