import { beforeEach, describe, expect, it } from 'vitest';

import { questionWorld } from '@tests/support/questionWorld';

import { Lesson } from '@application/entities/outline/Lesson';
import { Forbidden } from '@application/errors/common';
import { CourseArchived } from '@application/errors/course';
import { LessonNotFound } from '@application/errors/outline';
import { AskQuestionUseCase } from '@application/usecases/question/AskQuestionUseCase';

let world: Awaited<ReturnType<typeof questionWorld>>;

beforeEach(async () => {
  world = await questionWorld();
});

describe('AskQuestionUseCase', () => {
  it('should store the question of an enrolled student', async () => {
    const asked = await world.ask(world.student, '  Why?  ');

    expect(asked).toMatchObject({
      authorName: 'duda',
      text: 'Why?',
      answerCount: 0,
      removed: false,
      canDelete: true,
    });
    await expect(world.stored(asked.id)).resolves.toMatchObject({
      text: 'Why?',
    });
  });

  it('should refuse anyone without an active enrollment, the owner included', async () => {
    await expect(world.ask(world.other)).rejects.toThrow(Forbidden);
    await expect(world.ask(world.owner)).rejects.toThrow(Forbidden);
  });

  it('should refuse a question in an archived course', async () => {
    await world.setCourse({ status: 'ARCHIVED' });

    await expect(world.ask()).rejects.toThrow(CourseArchived);
  });

  it('should refuse a lesson that is not in the course', async () => {
    const askQuestion = new AskQuestionUseCase(
      world.courses,
      world.enrollments,
      world.lessons,
      world.questions,
      world.unitOfWork,
    );

    await expect(
      askQuestion.execute({
        author: world.student,
        courseId: world.course.id,
        lessonId: Lesson.toId('2HZXtsyCWqKbYadQSGc1G5hSJPo'),
        text: 'Why?',
      }),
    ).rejects.toThrow(LessonNotFound);
  });
});
