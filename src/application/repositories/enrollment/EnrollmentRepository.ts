import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import type { Enrollment } from '@application/entities/enrollment/Enrollment';

export interface EnrollmentRepository {
  // Always a strong read: every caller decides a write or an access on it (Q264).
  find: (
    accountId: Account.Id,
    courseId: Course.Id,
  ) => Promise<Enrollment | null>;

  createOperation: (enrollment: Enrollment) => UnitOfWork.Operation;

  reactivateOperation: (enrollment: Enrollment) => UnitOfWork.Operation;

  cancelOperation: (enrollment: Enrollment) => UnitOfWork.Operation;

  // Holds the transaction to an enrollment that is still active.
  activeOperation: (enrollment: Enrollment) => UnitOfWork.Operation;

  // Counts a completed lesson; the enrollment must still be active.
  addCompletedLessonsOperation: (
    enrollment: Enrollment,
    delta: number,
  ) => UnitOfWork.Operation;

  updateStudentName: (accountId: Account.Id, name: string) => Promise<void>;
}

export namespace EnrollmentRepository {}
