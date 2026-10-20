import { beforeEach, describe, expect, it } from 'vitest';

import { FakeCatalogIndex } from '@tests/fakes/FakeCatalogIndex';
import { courseWorld } from '@tests/support/courseWorld';

import { Course } from '@application/entities/course/Course';
import { IndexCourseUseCase } from '@application/usecases/catalog/IndexCourseUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let catalogIndex: FakeCatalogIndex;
let indexCourse: IndexCourseUseCase;

beforeEach(async () => {
  world = await courseWorld();
  catalogIndex = new FakeCatalogIndex();
  indexCourse = new IndexCourseUseCase(world.courses, catalogIndex);
});

describe('IndexCourseUseCase', () => {
  it('should save a published course with its description from the current state', async () => {
    await world.courses.update(world.course, { description: 'About keys' });
    await world.setCourse({
      status: 'PUBLISHED',
      publishedAt: '2026-10-17T12:00:00.000Z',
    });

    await indexCourse.execute({ courseId: world.course.id });

    expect(catalogIndex.records.get(world.course.id)).toEqual({
      courseId: world.course.id,
      title: 'T',
      description: 'About keys',
      instructorName: world.owner.name,
      publishedAt: '2026-10-17T12:00:00.000Z',
    });
  });

  it('should remove an archived course from the index', async () => {
    await world.setCourse({ status: 'ARCHIVED' });

    await indexCourse.execute({ courseId: world.course.id });

    expect(catalogIndex.removed).toEqual([world.course.id]);
  });

  it('should leave the index alone for a draft, which was never in it', async () => {
    await indexCourse.execute({ courseId: world.course.id });

    expect(catalogIndex.removed).toEqual([]);
    expect(catalogIndex.records.size).toBe(0);
  });

  it('should remove a course that no longer exists', async () => {
    const gone = Course.create({ instructor: world.owner, title: 'Gone' });

    await indexCourse.execute({ courseId: gone.id });

    expect(catalogIndex.removed).toEqual([gone.id]);
  });
});
