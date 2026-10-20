import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it } from 'vitest';

import { setCourseFields } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import { Conflict } from '@application/errors/common';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import type { EnrollmentItem } from '@infra/database/dynamo/items/enrollment/EnrollmentItem';
import { DynamoCourseRepository } from '@infra/database/dynamo/repositories/course/DynamoCourseRepository';
import { DynamoEnrollmentRepository } from '@infra/database/dynamo/repositories/enrollment/DynamoEnrollmentRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();
const courses = new DynamoCourseRepository(config);
const enrollments = new DynamoEnrollmentRepository(config);
const instructor = Account.create({ name: 'Ana', email: 'ana@example.com' });

const commit = async (...operations: Parameters<DynamoUnitOfWork['add']>) => {
  const unit = new DynamoUnitOfWork();
  unit.add(...operations);
  await unit.commit();
};

const publishedCourse = async () => {
  const course = Course.create({ instructor, title: 'T' });
  await courses.create(course);
  await setCourseFields(course, { lessonCount: 1 });

  return courses.publish(course.id, new Date());
};

const rawItem = async (enrollment: Enrollment) => {
  const { Item } = await dynamoClient.send(
    new GetCommand({
      TableName: config.mainTableName,
      Key: {
        PK: `ACCOUNT#${enrollment.accountId}`,
        SK: `ENROLLMENT#${enrollment.courseId}`,
      },
      ConsistentRead: true,
    }),
  );

  return Item;
};

const count = async (course: Course) =>
  (await courses.findById(course.id))?.enrollmentCount;

describe('DynamoEnrollmentRepository', () => {
  it('should enroll, cancel and enroll again, keeping the count and the place in both lists', async () => {
    const course = await publishedCourse();
    const student = Account.create({ name: 'Bia', email: 'b@example.com' });
    const enrollment = Enrollment.create({ student, course });
    const rule = { requirePublished: true };

    await commit(
      enrollments.createOperation(enrollment),
      courses.addEnrollmentsOperation(course, 1, rule),
    );
    const listed = (await rawItem(enrollment)) as EnrollmentItem.ItemType;
    expect(await count(course)).toBe(1);

    await commit(
      enrollments.cancelOperation(enrollment),
      courses.addEnrollmentsOperation(course, -1, { requirePublished: false }),
    );
    const cancelled = await rawItem(enrollment);
    expect(cancelled?.GSI1PK).toBeUndefined();
    expect(cancelled?.GSI2PK).toBeUndefined();
    expect(await count(course)).toBe(0);

    await commit(
      enrollments.reactivateOperation(enrollment),
      courses.addEnrollmentsOperation(course, 1, rule),
    );
    expect(await rawItem(enrollment)).toMatchObject({
      GSI1SK: listed.GSI1SK,
      GSI2SK: listed.GSI2SK,
    });
    expect((await enrollments.find(student.id, course.id))?.status).toBe(
      'ACTIVE',
    );
  });

  it('should count two enrollments of the same student at once only once', async () => {
    const course = await publishedCourse();
    const student = Account.create({ name: 'Bia', email: 'b@example.com' });
    const enroll = () =>
      commit(
        enrollments.createOperation(Enrollment.create({ student, course })),
        courses.addEnrollmentsOperation(course, 1, { requirePublished: true }),
      );

    const results = await Promise.allSettled([enroll(), enroll()]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await count(course)).toBe(1);
  });

  it('should refuse an enrollment in a course that is not published', async () => {
    const course = Course.create({ instructor, title: 'T' });
    await courses.create(course);
    const student = Account.create({ name: 'Bia', email: 'b@example.com' });
    const enrollment = Enrollment.create({ student, course });

    await expect(
      commit(
        enrollments.createOperation(enrollment),
        courses.addEnrollmentsOperation(course, 1, { requirePublished: true }),
      ),
    ).rejects.toBeInstanceOf(Conflict);
    expect(await rawItem(enrollment)).toBeUndefined();
  });
});
