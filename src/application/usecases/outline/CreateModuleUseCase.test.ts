import { beforeEach, describe, expect, it } from 'vitest';

import { courseWorld } from '@tests/support/courseWorld';

import { CourseArchived, CourseNotFound } from '@application/errors/course';
import { CreateModuleUseCase } from '@application/usecases/outline/CreateModuleUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let create: CreateModuleUseCase;

beforeEach(async () => {
  world = await courseWorld();
  create = new CreateModuleUseCase(
    world.courses,
    world.modules,
    world.outline,
    world.unitOfWork,
  );
});

describe('CreateModuleUseCase', () => {
  it('should put each new module at the end', async () => {
    const first = await create.execute({
      ...world.as(world.owner),
      title: 'A1 ',
    });
    const second = await create.execute({
      ...world.as(world.owner),
      title: 'B22',
    });

    expect([first.position, second.position]).toEqual([0, 1]);
    expect(first.title).toBe('A1');
  });

  it('should let an admin add a module and hide the draft from another instructor', async () => {
    await expect(
      create.execute({ ...world.as(world.admin), title: 'Adm' }),
    ).resolves.toMatchObject({ title: 'Adm' });
    await expect(
      create.execute({ ...world.as(world.other), title: 'No' }),
    ).rejects.toBeInstanceOf(CourseNotFound);
  });

  it('should refuse any change to an archived course', async () => {
    await world.setCourse({ status: 'ARCHIVED' });

    await expect(
      create.execute({ ...world.as(world.owner), title: 'Nope' }),
    ).rejects.toBeInstanceOf(CourseArchived);
  });
});
