import { beforeEach, describe, expect, it } from 'vitest';

import { uniqueEmail } from '@tests/support/accountWorld';
import { courseWorld } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import { Review } from '@application/entities/review/Review';
import { Conflict } from '@application/errors/common';

let world: Awaited<ReturnType<typeof courseWorld>>;
let student: Account;
let enrollment: Enrollment;

const commit = async (
  ...operations: Parameters<ReturnType<typeof world.unitOfWork>['add']>
) => {
  const unit = world.unitOfWork();
  unit.add(...operations);
  await unit.commit();
};

const create = (rating: number) => {
  const review = Review.create({
    student,
    course: world.course,
    rating,
    comment: 'Good',
  });

  return commit(
    world.reviews.createOperation(review),
    world.courses.addRatingsOperation(world.course, {
      sumDelta: rating,
      countDelta: 1,
    }),
    world.enrollments.activeOperation(enrollment),
  );
};

const ratings = async () => {
  const course = await world.storedCourse();

  return [course?.ratingSum, course?.ratingCount];
};

beforeEach(async () => {
  world = await courseWorld();
  await world.setCourse({ status: 'PUBLISHED' });
  student = Account.create({ name: 'Duda', email: uniqueEmail('duda') });
  enrollment = Enrollment.create({ student, course: world.course });
  await commit(world.enrollments.createOperation(enrollment));
});

describe('DynamoReviewRepository', () => {
  it('should create one review per student and count it on the course', async () => {
    await create(4);

    await expect(create(5)).rejects.toBeInstanceOf(Conflict);
    await expect(ratings()).resolves.toEqual([4, 1]);
    await expect(
      world.reviews.find(student.id, world.course.id),
    ).resolves.toMatchObject({
      rating: 4,
      comment: 'Good',
      studentName: 'Duda',
    });
  });

  it('should move the sum by the difference, held to the rating read', async () => {
    await create(4);
    const review = await world.reviews.find(student.id, world.course.id);

    if (!review) {
      throw new Error('The review was not stored.');
    }

    review.rating = 2;
    await commit(
      world.reviews.updateOperation(review, 4),
      world.courses.addRatingsOperation(world.course, {
        sumDelta: -2,
        countDelta: 0,
      }),
      world.enrollments.activeOperation(enrollment),
    );
    await expect(ratings()).resolves.toEqual([2, 1]);

    await expect(
      commit(
        world.reviews.updateOperation(review, 4),
        world.courses.addRatingsOperation(world.course, {
          sumDelta: 1,
          countDelta: 0,
        }),
      ),
    ).rejects.toBeInstanceOf(Conflict);
    await expect(ratings()).resolves.toEqual([2, 1]);
  });

  it('should refuse a review from a cancelled enrollment', async () => {
    await commit(world.enrollments.cancelOperation(enrollment));

    await expect(create(5)).rejects.toBeInstanceOf(Conflict);
    await expect(ratings()).resolves.toEqual([0, 0]);
  });
});
