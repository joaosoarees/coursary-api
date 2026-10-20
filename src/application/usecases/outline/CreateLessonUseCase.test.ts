import { beforeEach, describe, expect, it } from 'vitest';

import { courseWorld } from '@tests/support/courseWorld';

import { Module } from '@application/entities/outline/Module';
import { CourseNotFound } from '@application/errors/course';
import { ModuleNotFound } from '@application/errors/outline';
import { CreateLessonUseCase } from '@application/usecases/outline/CreateLessonUseCase';

const content = { title: 'Keys', body: '# Keys', durationMinutes: 10 };

let world: Awaited<ReturnType<typeof courseWorld>>;
let module: Module;
let create: CreateLessonUseCase;

beforeEach(async () => {
  world = await courseWorld();
  module = await world.addModule('M1', 0);
  create = new CreateLessonUseCase(
    world.courses,
    world.modules,
    world.lessons,
    world.outline,
    world.unitOfWork,
  );
});

describe('CreateLessonUseCase', () => {
  it('should add lessons at the end of the module and count them on the course', async () => {
    const first = await create.execute({
      ...world.as(world.owner),
      moduleId: module.id,
      ...content,
    });
    const second = await create.execute({
      ...world.as(world.owner),
      moduleId: module.id,
      ...content,
    });

    expect([first.position, second.position]).toEqual([0, 1]);
    expect((await world.storedCourse())?.lessonCount).toBe(2);
  });

  it('should refuse a module that is not in the course', async () => {
    const elsewhere = Module.create({
      courseId: world.course.id,
      title: 'X',
      position: 0,
    });

    await expect(
      create.execute({
        ...world.as(world.owner),
        moduleId: elsewhere.id,
        ...content,
      }),
    ).rejects.toBeInstanceOf(ModuleNotFound);
  });

  it('should hide the draft from another instructor', async () => {
    await expect(
      create.execute({
        ...world.as(world.other),
        moduleId: module.id,
        ...content,
      }),
    ).rejects.toBeInstanceOf(CourseNotFound);
  });
});
