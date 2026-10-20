import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import { EnrollmentItem } from '@infra/database/dynamo/items/enrollment/EnrollmentItem';

const instructor = Account.create({ name: 'Ana', email: 'ana@example.com' });
const student = Account.create({ name: 'Bia', email: 'bia@example.com' });
const course = Course.create({ instructor, title: 'T' });

describe('EnrollmentItem', () => {
  it('should keep the enrollment in the student partition and list an active one under the course and the student', () => {
    const enrollment = Enrollment.create({ student, course });

    expect(EnrollmentItem.fromEntity(enrollment).toItem()).toMatchObject({
      PK: `ACCOUNT#${student.id}`,
      SK: `ENROLLMENT#${course.id}`,
      GSI1PK: `COURSE#${course.id}`,
      GSI1SK: `ENROLLMENT#${enrollment.enrolledAt.toISOString()}#${student.id}`,
      GSI2PK: `ENROLLMENTS#${student.id}`,
      GSI2SK: `${enrollment.enrolledAt.toISOString()}#${course.id}`,
      studentName: 'Bia',
      completedLessons: 0,
    });
  });

  it('should leave a cancelled enrollment out of both lists', () => {
    const enrollment = Enrollment.create({ student, course });
    enrollment.status = 'CANCELLED';
    const item = EnrollmentItem.fromEntity(enrollment).toItem();

    expect(item).not.toHaveProperty('GSI1PK');
    expect(item).not.toHaveProperty('GSI2PK');
  });
});
