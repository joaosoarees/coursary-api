import { beforeEach, describe, expect, it } from 'vitest';

import { courseWorld } from '@tests/support/courseWorld';

import { CoursePublished } from '@application/errors/course';
import { LessonNotFound } from '@application/errors/outline';
import { DeleteLessonUseCase } from '@application/usecases/outline/DeleteLessonUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let remove: DeleteLessonUseCase;

beforeEach(async () => {
  world = await courseWorld();
  remove = new DeleteLessonUseCase(
    world.courses,
    world.modules,
    world.lessons,
    world.unitOfWork,
  );
});

describe('DeleteLessonUseCase', () => {
  it('should delete a lesson of a draft and take it off the count', async () => {
    const module = await world.addModule('M1', 0);
    const lesson = await world.addLesson(module, 0);
    const input = {
      ...world.as(world.owner),
      moduleId: module.id,
      lessonId: lesson.id,
    };

    await remove.execute(input);

    expect((await world.storedCourse())?.lessonCount).toBe(0);
    await expect(remove.execute(input)).rejects.toBeInstanceOf(LessonNotFound);
  });

  it('should keep the lessons of a published course', async () => {
    const module = await world.addModule('M1', 0);
    const lesson = await world.addLesson(module, 0);
    await world.setCourse({ status: 'PUBLISHED' });

    await expect(
      remove.execute({
        ...world.as(world.owner),
        moduleId: module.id,
        lessonId: lesson.id,
      }),
    ).rejects.toBeInstanceOf(CoursePublished);
  });
});
