import { describe, expect, it } from 'vitest';

import { uniqueEmail } from '@tests/support/accountWorld';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import { InvalidCursor } from '@application/errors/common';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { DynamoListCourseStudentsQuery } from '@infra/database/dynamo/queries/enrollment/DynamoListCourseStudentsQuery';
import { DynamoCourseRepository } from '@infra/database/dynamo/repositories/course/DynamoCourseRepository';
import { DynamoEnrollmentRepository } from '@infra/database/dynamo/repositories/enrollment/DynamoEnrollmentRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();
const courses = new DynamoCourseRepository(config);
const enrollments = new DynamoEnrollmentRepository(config);
const query = new DynamoListCourseStudentsQuery(config);
const instructor = Account.create({ name: 'Ana', email: uniqueEmail('ana') });

const courseWithStudents = async (count: number) => {
  const course = Course.create({ instructor, title: 'T' });
  await courses.create(course);

  for (let i = 0; i < count; i++) {
    const student = Account.create({ name: 'Bia', email: uniqueEmail('bia') });
    const unit = new DynamoUnitOfWork();
    unit.add(
      enrollments.createOperation(Enrollment.create({ student, course })),
    );
    await unit.commit();
  }

  return course;
};

describe('DynamoListCourseStudentsQuery', () => {
  it('should list only the students of the course across pages', async () => {
    const course = await courseWithStudents(3);
    await courseWithStudents(2);
    const ids: string[] = [];
    let cursor: string | undefined;

    do {
      const page = await query.execute({
        courseId: course.id,
        page: { limit: 2, cursor },
      });
      ids.push(...page.items.map((item) => item.accountId));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    expect(new Set(ids).size).toBe(3);
  });

  it('should refuse a cursor from another course', async () => {
    const first = await courseWithStudents(2);
    const second = await courseWithStudents(2);
    const { nextCursor } = await query.execute({
      courseId: first.id,
      page: { limit: 1 },
    });

    await expect(
      query.execute({
        courseId: second.id,
        page: { limit: 1, cursor: nextCursor ?? undefined },
      }),
    ).rejects.toBeInstanceOf(InvalidCursor);
  });
});
