import { beforeEach, describe, expect, it } from 'vitest';

import { courseWorld } from '@tests/support/courseWorld';

import { UpdateModuleUseCase } from '@application/usecases/outline/UpdateModuleUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;

beforeEach(async () => {
  world = await courseWorld();
});

describe('UpdateModuleUseCase', () => {
  it('should rename a module', async () => {
    const module = await world.addModule('Old', 0);

    await new UpdateModuleUseCase(
      world.courses,
      world.modules,
      world.unitOfWork,
    ).execute({
      ...world.as(world.owner),
      moduleId: module.id,
      title: ' New ',
    });

    expect(
      (await world.modules.findById(world.course.id, module.id))?.title,
    ).toBe('New');
  });
});
