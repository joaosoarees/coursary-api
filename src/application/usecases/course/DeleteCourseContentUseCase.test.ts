import { beforeEach, describe, expect, it, vi } from 'vitest';

import { courseWorld } from '@tests/support/courseWorld';

import type { Course } from '@application/entities/course/Course';
import { DeleteCourseContentUseCase } from '@application/usecases/course/DeleteCourseContentUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let queued: Course.Id[];
let deleteContent: DeleteCourseContentUseCase;

beforeEach(async () => {
  world = await courseWorld();
  queued = [];
  deleteContent = new DeleteCourseContentUseCase(world.courseDeletion, {
    enqueue: (courseIds) => {
      queued.push(...courseIds);

      return Promise.resolve();
    },
  });
});

describe('DeleteCourseContentUseCase', () => {
  it('should queue the next page while there is content, then finish', async () => {
    await world.addModule('M1', 0);
    await world.courses.markDeleting(world.course.id);
    const courseId = world.course.id;

    await expect(deleteContent.execute({ courseId })).resolves.toBe('more');
    expect(queued).toEqual([courseId]);

    await expect(deleteContent.execute({ courseId })).resolves.toBe('done');
    expect(queued).toEqual([courseId]);
  });

  it('should refuse a live course, queue nothing and log it', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(
      deleteContent.execute({ courseId: world.course.id }),
    ).resolves.toBe('not-deleting');
    expect(queued).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('CourseDeletionRefused'),
    );
  });
});
