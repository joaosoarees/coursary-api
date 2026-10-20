import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import type { Review } from '@application/entities/review/Review';

export interface ReviewRepository {
  find: (accountId: Account.Id, courseId: Course.Id) => Promise<Review | null>;

  createOperation: (review: Review) => UnitOfWork.Operation;

  // Holds the edit to the rating the caller read, so the counter moves by the
  // right difference.
  updateOperation: (
    review: Review,
    previousRating: number,
  ) => UnitOfWork.Operation;

  updateStudentName: (accountId: Account.Id, name: string) => Promise<void>;
}
