import { beforeEach, describe, expect, it } from 'vitest';

import { courseWorld } from '@tests/support/courseWorld';

import type { Account } from '@application/entities/account/Account';
import { Forbidden } from '@application/errors/common';
import { CourseArchived, CourseNotFound } from '@application/errors/course';
import { UpdateCourseUseCase } from '@application/usecases/course/UpdateCourseUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;

beforeEach(async () => {
  world = await courseWorld();
});

const update = (caller: Account) =>
  new UpdateCourseUseCase(world.courses).execute({
    ...world.as(caller),
    changes: { title: 'New title' },
  });

describe('UpdateCourseUseCase', () => {
  it('should let the owner and an admin change the course', async () => {
    await expect(update(world.owner)).resolves.toMatchObject({
      title: 'New title',
    });
    await expect(update(world.admin)).resolves.toMatchObject({
      title: 'New title',
    });
  });

  it('should answer with the stored description when only the title changes', async () => {
    const use = new UpdateCourseUseCase(world.courses);
    await use.execute({
      ...world.as(world.owner),
      changes: { description: 'About' },
    });

    await expect(update(world.owner)).resolves.toMatchObject({
      title: 'New title',
      description: 'About',
    });
  });

  it('should hide a draft of another instructor (404) and refuse a visible one (403)', async () => {
    await expect(update(world.other)).rejects.toBeInstanceOf(CourseNotFound);

    await world.setCourse({ status: 'PUBLISHED' });
    await expect(update(world.other)).rejects.toBeInstanceOf(Forbidden);
  });

  it('should refuse an archived course, also to an admin', async () => {
    await world.setCourse({ status: 'ARCHIVED' });

    await expect(update(world.owner)).rejects.toBeInstanceOf(CourseArchived);
    await expect(update(world.admin)).rejects.toBeInstanceOf(CourseArchived);
  });
});
