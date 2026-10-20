import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { CatalogItem } from '@application/queries/catalog/CatalogItem';
import { CoursePage } from '@application/queries/catalog/CoursePage';
import { CourseOutline } from '@application/queries/outline/CourseOutline';

describe('CoursePage', () => {
  it('should be the catalog item with the description and the outline', () => {
    const instructor = Account.create({ name: 'Ana', email: 'a@example.com' });
    const course = Course.create({ instructor, title: 'DynamoDB' });
    course.status = 'PUBLISHED';
    course.publishedAt = new Date('2026-10-17T12:00:00.000Z');
    course.ratingSum = 9;
    course.ratingCount = 2;

    const page = CoursePage.fromCourse(
      course,
      'Keys',
      new CourseOutline({ modules: [] }),
    );

    expect(JSON.parse(JSON.stringify(page))).toEqual({
      ...JSON.parse(JSON.stringify(CatalogItem.fromCourse(course))),
      description: 'Keys',
      modules: [],
    });
    expect(page.ratingAverage).toBe(4.5);
  });
});
