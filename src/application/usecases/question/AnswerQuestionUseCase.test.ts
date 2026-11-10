import { beforeEach, describe, expect, it } from 'vitest';

import { questionWorld } from '@tests/support/questionWorld';

import { Question } from '@application/entities/question/Question';
import { Conflict, Forbidden } from '@application/errors/common';
import { CourseArchived } from '@application/errors/course';
import {
  QuestionNotFound,
  QuestionRemoved,
} from '@application/errors/question';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import { AnswerQuestionUseCase } from '@application/usecases/question/AnswerQuestionUseCase';

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

  it("should refuse the owner's answer when the course is archived after it was read", async () => {
    const asked = await world.ask();
    const courses = Object.create(world.courses) as CourseRepository;
    courses.findById = async (id) => {
      const found = await world.courses.findById(id);
      await world.setCourse({ status: 'ARCHIVED' });

      return found;
    };
    const answerQuestion = new AnswerQuestionUseCase(
      courses,
      world.enrollments,
      world.questions,
      world.unitOfWork,
    );

    await expect(
      answerQuestion.execute({
        author: world.owner,
        courseId: world.course.id,
        lessonId: world.lesson.id,
        questionId: Question.toId(asked.id),
        text: 'Because.',
      }),
    ).rejects.toThrow(Conflict);
  });
});
