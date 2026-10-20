import { beforeEach, describe, expect, it } from 'vitest';

import { uniqueEmail } from '@tests/support/accountWorld';
import { courseWorld } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { Review } from '@application/entities/review/Review';
import { ReviewNotFound } from '@application/errors/review';
import { GetMyReviewUseCase } from '@application/usecases/review/GetMyReviewUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let getMyReview: GetMyReviewUseCase;
let student: Account;

const mine = () =>
  getMyReview.execute({ callerId: student.id, courseId: world.course.id });

beforeEach(async () => {
  world = await courseWorld();
  getMyReview = new GetMyReviewUseCase(world.reviews);
  student = Account.create({ name: 'Duda', email: uniqueEmail('duda') });
});

describe('GetMyReviewUseCase', () => {
  it('should return the caller review, with or without an enrollment', async () => {
    const unit = world.unitOfWork();
    unit.add(
      world.reviews.createOperation(
        Review.create({
          student,
          course: world.course,
          rating: 5,
          comment: '',
        }),
      ),
    );
    await unit.commit();

    await expect(mine()).resolves.toMatchObject({
      courseId: world.course.id,
      rating: 5,
    });
  });

  it('should answer not found for a student who never reviewed', async () => {
    await expect(mine()).rejects.toBeInstanceOf(ReviewNotFound);
  });
});
