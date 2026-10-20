import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { CourseItem } from '@infra/database/dynamo/items/course/CourseItem';

const instructor = Account.create({ name: 'Ana', email: 'ana@example.com' });

describe('CourseItem', () => {
  it('should build the table key and the instructor index key', () => {
    const course = Course.create({
      instructor,
      title: ' DynamoDB ',
    });

    expect(CourseItem.fromEntity(course).toItem()).toMatchObject({
      PK: `COURSE#${course.id}`,
      SK: `COURSE#${course.id}`,
      GSI1PK: `INSTRUCTOR#${instructor.id}`,
      GSI1SK: `COURSE#${course.id}`,
      type: 'Course',
      title: 'DynamoDB',
      instructorName: 'Ana',
      status: 'DRAFT',
      lessonCount: 0,
      enrollmentCount: 0,
    });
  });

  it('should read back the same course it wrote', () => {
    const course = Course.create({ instructor, title: 'T' });

    expect(CourseItem.toEntity(CourseItem.fromEntity(course).toItem())).toEqual(
      course,
    );
  });

  it('should put only a published course in the catalog index', () => {
    const course = Course.create({ instructor, title: 'T' });

    expect(CourseItem.fromEntity(course).toItem()).not.toHaveProperty('GSI2PK');

    course.status = 'PUBLISHED';
    course.publishedAt = new Date('2026-10-15T12:00:00.000Z');

    expect(CourseItem.fromEntity(course).toItem()).toMatchObject({
      GSI2PK: 'CATALOG',
      GSI2SK: `2026-10-15T12:00:00.000Z#${course.id}`,
    });
  });

  it('should read a course being deleted as absent, and any other as itself', () => {
    const course = Course.create({ instructor, title: 'T' });
    const item = CourseItem.fromEntity(course).toItem();

    expect(CourseItem.toLiveEntity(item)).toEqual(course);
    expect(
      CourseItem.toLiveEntity({ ...item, status: 'DELETING' as never }),
    ).toBeNull();
  });
});
