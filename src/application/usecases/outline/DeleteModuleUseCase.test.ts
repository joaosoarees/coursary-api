import { beforeEach, describe, expect, it } from 'vitest';

import { courseWorld } from '@tests/support/courseWorld';

import { CoursePublished } from '@application/errors/course';
import { ModuleNotEmpty } from '@application/errors/outline';
import { DeleteModuleUseCase } from '@application/usecases/outline/DeleteModuleUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let remove: DeleteModuleUseCase;

beforeEach(async () => {
  world = await courseWorld();
  remove = new DeleteModuleUseCase(
    world.courses,
    world.modules,
    world.unitOfWork,
  );
});

describe('DeleteModuleUseCase', () => {
  it('should delete an empty module of a draft only', async () => {
    const module = await world.addModule('M1', 0);
    await world.setCourse({ status: 'PUBLISHED' });

    await expect(
      remove.execute({ ...world.as(world.owner), moduleId: module.id }),
    ).rejects.toBeInstanceOf(CoursePublished);

    await world.setCourse({ status: 'DRAFT' });
    await remove.execute({ ...world.as(world.owner), moduleId: module.id });
    expect(await world.modules.findById(world.course.id, module.id)).toBeNull();
  });

  it('should refuse to delete a module with lessons', async () => {
    const module = await world.addModule('M1', 0);
    await world.addLesson(module, 0);

    await expect(
      remove.execute({ ...world.as(world.owner), moduleId: module.id }),
    ).rejects.toBeInstanceOf(ModuleNotEmpty);
  });
});
