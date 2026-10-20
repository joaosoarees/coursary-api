import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it, vi } from 'vitest';

import { uniqueEmail } from '@tests/support/accountWorld';
import { setCourseFields } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import { InvalidCursor } from '@application/errors/common';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { DynamoListMyEnrollmentsQuery } from '@infra/database/dynamo/queries/enrollment/DynamoListMyEnrollmentsQuery';
import { DynamoCourseRepository } from '@infra/database/dynamo/repositories/course/DynamoCourseRepository';
import { DynamoEnrollmentRepository } from '@infra/database/dynamo/repositories/enrollment/DynamoEnrollmentRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();
const courses = new DynamoCourseRepository(config);
const enrollments = new DynamoEnrollmentRepository(config);
const query = new DynamoListMyEnrollmentsQuery(
  config,
  new DynamoCourseRepository(config),
);
const instructor = Account.create({ name: 'Ana', email: uniqueEmail('ana') });

const commit = async (...operations: Parameters<DynamoUnitOfWork['add']>) => {
  const unit = new DynamoUnitOfWork();
  unit.add(...operations);
  await unit.commit();
};

// Enrolls the student in a new published course on the given day of 2026.
const enrollOn = async (student: Account, day: number) => {
  const course = Course.create({
    instructor,
    title: `Day ${String(day)}`,
  });
  await courses.create(course);
  await setCourseFields(course, { status: 'PUBLISHED', lessonCount: 3 });
  const enrollment = new Enrollment({
    accountId: student.id,
    courseId: course.id,
    status: 'ACTIVE',
    studentName: student.name,
    enrolledAt: new Date(Date.UTC(2026, 0, day)),
    completedLessons: 0,
  });
  await commit(enrollments.createOperation(enrollment));

  return { course, enrollment };
};

const newStudent = () =>
  Account.create({ name: 'Bia', email: uniqueEmail('bia') });

describe('DynamoListMyEnrollmentsQuery', () => {
  it('should list the active enrollments with their course, newest first, across pages', async () => {
    const student = newStudent();
    await enrollOn(student, 1);
    const { enrollment: cancelled } = await enrollOn(student, 2);
    await enrollOn(student, 3);
    const { course: archived } = await enrollOn(student, 4);
    await commit(enrollments.cancelOperation(cancelled));
    await setCourseFields(archived, { status: 'ARCHIVED' });
    const listed = [];
    let cursor: string | undefined;

    do {
      const page = await query.execute({
        accountId: student.id,
        page: { limit: 2, cursor },
      });
      listed.push(...page.items);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    expect(listed.map((item) => item.title)).toEqual([
      'Day 4',
      'Day 3',
      'Day 1',
    ]);
    expect(listed[0]).toMatchObject({
      courseId: archived.id,
      instructorName: 'Ana',
      lessonCount: 3,
      completedLessons: 0,
      enrolledAt: '2026-01-04T00:00:00.000Z',
      courseStatus: 'ARCHIVED',
    });
  });

  it('should refuse a cursor from another student', async () => {
    const ana = newStudent();
    const bia = newStudent();
    await enrollOn(ana, 1);
    await enrollOn(ana, 2);
    const { nextCursor } = await query.execute({
      accountId: ana.id,
      page: { limit: 1 },
    });

    await expect(
      query.execute({
        accountId: bia.id,
        page: { limit: 1, cursor: nextCursor ?? undefined },
      }),
    ).rejects.toBeInstanceOf(InvalidCursor);
  });

  it('should leave out an enrollment whose course is gone, and log it', async () => {
    const student = newStudent();
    const { course } = await enrollOn(student, 1);
    await enrollOn(student, 2);
    await dynamoClient.send(
      new DeleteCommand({
        TableName: config.mainTableName,
        Key: { PK: `COURSE#${course.id}`, SK: `COURSE#${course.id}` },
      }),
    );
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const { items } = await query.execute({
      accountId: student.id,
      page: { limit: 10 },
    });

    expect(items.map((item) => item.title)).toEqual(['Day 2']);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('EnrollmentWithoutCourse'),
    );
  });
});
