import { beforeEach, describe, expect, it } from 'vitest';

import { FakePublicAssetUrls } from '@tests/fakes/FakePublicAssetUrls';
import { courseWorld } from '@tests/support/courseWorld';

import type { Account } from '@application/entities/account/Account';
import { Forbidden } from '@application/errors/common';
import { CourseNotFound } from '@application/errors/course';
import { GetManagedCourseUseCase } from '@application/usecases/course/GetManagedCourseUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;

beforeEach(async () => {
  world = await courseWorld();
});

const read = (caller: Account) =>
  new GetManagedCourseUseCase(world.courses, new FakePublicAssetUrls()).execute(
    world.as(caller),
  );

describe('GetManagedCourseUseCase', () => {
  it('should show the owner a draft with its description', async () => {
    await world.courses.update(world.course, { description: 'About keys' });

    await expect(read(world.owner)).resolves.toMatchObject({
      id: world.course.id,
      status: 'DRAFT',
      description: 'About keys',
    });
  });

  it('should show an admin any course and an archived one to its owner', async () => {
    await expect(read(world.admin)).resolves.toMatchObject({
      status: 'DRAFT',
    });

    await world.setCourse({ status: 'ARCHIVED' });

    await expect(read(world.owner)).resolves.toMatchObject({
      status: 'ARCHIVED',
    });
  });

  it("should hide another instructor's draft and refuse a published one", async () => {
    await expect(read(world.other)).rejects.toBeInstanceOf(CourseNotFound);

    await world.setCourse({ status: 'PUBLISHED' });

    await expect(read(world.other)).rejects.toBeInstanceOf(Forbidden);
  });
});
