import { beforeEach, describe, expect, it } from 'vitest';

import { uniqueEmail } from '@tests/support/accountWorld';
import { courseWorld } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { EnrollmentNotFound } from '@application/errors/enrollment';
import { CancelEnrollmentUseCase } from '@application/usecases/enrollment/CancelEnrollmentUseCase';
import { EnrollUseCase } from '@application/usecases/enrollment/EnrollUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let cancel: CancelEnrollmentUseCase;
let student: Account;

beforeEach(async () => {
  world = await courseWorld();
  cancel = new CancelEnrollmentUseCase(
    world.courses,
    world.enrollments,
    world.unitOfWork,
  );
  student = Account.create({ name: 'Duda', email: uniqueEmail('duda') });
  await world.setCourse({ status: 'PUBLISHED' });
});

const cancelStudent = () =>
  cancel.execute({ callerId: student.id, courseId: world.course.id });

describe('CancelEnrollmentUseCase', () => {
  it('should cancel once, keep the enrollment and uncount the student', async () => {
    await new EnrollUseCase(
      world.courses,
      world.enrollments,
      world.unitOfWork,
    ).execute({ student, courseId: world.course.id });

    await cancelStudent();
    await cancelStudent();

    await expect(
      world.enrollments.find(student.id, world.course.id),
    ).resolves.toMatchObject({ status: 'CANCELLED' });
    await expect(world.storedCourse()).resolves.toMatchObject({
      enrollmentCount: 0,
    });
  });

  it('should let an enrolled student leave an archived course', async () => {
    await new EnrollUseCase(
      world.courses,
      world.enrollments,
      world.unitOfWork,
    ).execute({ student, courseId: world.course.id });
    await world.setCourse({ status: 'ARCHIVED' });

    await cancelStudent();

    await expect(world.storedCourse()).resolves.toMatchObject({
      enrollmentCount: 0,
    });
  });

  it('should answer not found for a student who never enrolled', async () => {
    await expect(cancelStudent()).rejects.toBeInstanceOf(EnrollmentNotFound);
  });
});
