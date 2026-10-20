import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeCatalogSearch } from '@tests/fakes/FakeCatalogSearch';
import { courseWorld, setCourseFields } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { SearchCatalogUseCase } from '@application/usecases/catalog/SearchCatalogUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
const instructor = Account.create({ name: 'Ana', email: 'ana@example.com' });

const storedCourse = async (title: string, status: Course.Status) => {
  const course = Course.create({ instructor, title });
  await world.courses.create(course);
  await setCourseFields(course, {
    status,
    publishedAt: '2026-10-17T12:00:00.000Z',
  });

  return course;
};

let catalogSearch: FakeCatalogSearch;
let searchCatalog: SearchCatalogUseCase;

beforeEach(async () => {
  world = await courseWorld();
  catalogSearch = new FakeCatalogSearch();
  searchCatalog = new SearchCatalogUseCase(catalogSearch, world.courses);
});

describe('SearchCatalogUseCase', () => {
  it('should answer the courses in the order of the index, read from the table', async () => {
    const first = await storedCourse('First', 'PUBLISHED');
    const second = await storedCourse('Second', 'PUBLISHED');
    catalogSearch.courseIds = [second.id, first.id];
    catalogSearch.totalItems = 2;
    catalogSearch.totalPages = 1;

    const result = await searchCatalog.execute({
      query: 'course',
      page: 0,
      perPage: 20,
    });

    expect(result).toMatchObject({ page: 0, totalItems: 2, totalPages: 1 });
    expect(result.items.map((item) => item.title)).toEqual(['Second', 'First']);
    expect(result.items[0]).toEqual({
      id: second.id,
      title: 'Second',
      instructorName: 'Ana',
      lessonCount: 0,
      enrollmentCount: 0,
      ratingCount: 0,
      ratingAverage: null,
      publishedAt: '2026-10-17T12:00:00.000Z',
    });
  });

  it('should drop and log a hit the table no longer has published', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const kept = await storedCourse('Kept', 'PUBLISHED');
    const archived = await storedCourse('Archived', 'ARCHIVED');
    const gone = Course.create({ instructor, title: 'Gone' });
    catalogSearch.courseIds = [archived.id, kept.id, gone.id];

    const { items } = await searchCatalog.execute({
      query: 'x',
      page: 0,
      perPage: 20,
    });

    expect(items.map((item) => item.id)).toEqual([kept.id]);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('SearchHitDropped'),
    );
  });
});
