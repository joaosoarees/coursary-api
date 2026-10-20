import { beforeEach, describe, expect, it } from 'vitest';

import { courseWorld } from '@tests/support/courseWorld';

import { UpdateLessonUseCase } from '@application/usecases/outline/UpdateLessonUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;

beforeEach(async () => {
  world = await courseWorld();
});

describe('UpdateLessonUseCase', () => {
  it('should change only the fields given, also for an admin', async () => {
    const module = await world.addModule('M1', 0);
    const lesson = await world.addLesson(module, 0);

    const changed = await new UpdateLessonUseCase(
      world.courses,
      world.lessons,
      world.unitOfWork,
    ).execute({
      ...world.as(world.admin),
      moduleId: module.id,
      lessonId: lesson.id,
      changes: { durationMinutes: 20 },
    });

    expect(changed).toMatchObject({ title: 'L0', durationMinutes: 20 });
  });
});
