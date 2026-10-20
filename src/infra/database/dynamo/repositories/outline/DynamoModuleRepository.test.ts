import { beforeEach, describe, expect, it } from 'vitest';

import { courseWorld } from '@tests/support/courseWorld';

import { Lesson } from '@application/entities/outline/Lesson';
import { Module } from '@application/entities/outline/Module';
import { Conflict } from '@application/errors/common';
import { ModuleNotEmpty, ModuleNotFound } from '@application/errors/outline';

let world: Awaited<ReturnType<typeof courseWorld>>;

beforeEach(async () => {
  world = await courseWorld();
});

describe('DynamoModuleRepository', () => {
  it('should refuse the whole change when the course status moved', async () => {
    const module = await world.addModule('M1', 0);
    await world.setCourse({ status: 'PUBLISHED' });
    module.title = 'Renamed';
    const unit = world.unitOfWork();
    unit.add(
      world.modules.renameOperation(module),
      world.courses.statusUnchangedOperation(world.course),
    );

    await expect(unit.commit()).rejects.toBeInstanceOf(Conflict);
    expect(
      (await world.modules.findById(world.course.id, module.id))?.title,
    ).toBe('M1');
  });

  it('should delete only an empty module, whatever was read before', async () => {
    const module = await world.addModule('M1', 0);
    const stale = await world.modules.findById(world.course.id, module.id);
    await world.addLesson(module, 0);
    const unit = world.unitOfWork();
    unit.add(world.modules.deleteOperation(stale ?? module));

    await expect(unit.commit()).rejects.toBeInstanceOf(ModuleNotEmpty);

    const gone = world.unitOfWork();
    gone.add(
      world.modules.deleteOperation(
        Module.create({ courseId: world.course.id, title: 'X', position: 9 }),
      ),
    );
    await expect(gone.commit()).rejects.toBeInstanceOf(ModuleNotFound);
  });

  it('should refuse a lesson in a module that no longer exists and write nothing', async () => {
    const missing = Module.create({
      courseId: world.course.id,
      title: 'Gone',
      position: 0,
    });
    const lesson = Lesson.create({
      courseId: world.course.id,
      moduleId: missing.id,
      title: 'L',
      body: '',
      durationMinutes: 5,
      position: 0,
    });
    const unit = world.unitOfWork();
    unit.add(
      ...world.lessons.createOperations(lesson),
      world.modules.addLessonsOperation(world.course.id, missing.id, 1),
      world.courses.addLessonsOperation(world.course, 1),
    );

    await expect(unit.commit()).rejects.toBeInstanceOf(ModuleNotFound);
    await expect(world.storedCourse()).resolves.toMatchObject({
      lessonCount: 0,
    });
  });
});
