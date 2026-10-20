import { beforeEach, describe, expect, it } from 'vitest';

import { courseWorld } from '@tests/support/courseWorld';

import { Forbidden } from '@application/errors/common';
import { CourseNotDraft, CourseNotFound } from '@application/errors/course';
import { DeleteCourseUseCase } from '@application/usecases/course/DeleteCourseUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let deleteCourse: DeleteCourseUseCase;

beforeEach(async () => {
  world = await courseWorld();
  deleteCourse = new DeleteCourseUseCase(world.courses);
});

describe('DeleteCourseUseCase', () => {
  it('should mark the owner draft as being deleted, then find it no more', async () => {
    await expect(deleteCourse.execute(world.as(world.owner))).resolves.toEqual({
      id: world.course.id,
      status: 'DELETING',
    });

    await expect(world.storedCourse()).resolves.toBeNull();
    await expect(
      deleteCourse.execute(world.as(world.owner)),
    ).rejects.toBeInstanceOf(CourseNotFound);
  });

  it('should let an admin delete a draft and hide it from another instructor', async () => {
    await expect(
      deleteCourse.execute(world.as(world.other)),
    ).rejects.toBeInstanceOf(CourseNotFound);
    await expect(
      deleteCourse.execute(world.as(world.admin)),
    ).resolves.toMatchObject({ status: 'DELETING' });
  });

  it.each([
    ['PUBLISHED', CourseNotDraft],
    ['ARCHIVED', CourseNotDraft],
  ] as const)('should refuse a %s course', async (status, error) => {
    await world.setCourse({ status });

    await expect(
      deleteCourse.execute(world.as(world.owner)),
    ).rejects.toBeInstanceOf(error);
  });

  it('should refuse another instructor a published course they can see', async () => {
    await world.setCourse({ status: 'PUBLISHED' });

    await expect(
      deleteCourse.execute(world.as(world.other)),
    ).rejects.toBeInstanceOf(Forbidden);
  });
});
