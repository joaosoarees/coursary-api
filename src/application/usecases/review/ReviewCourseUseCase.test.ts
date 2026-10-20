import { beforeEach, describe, expect, it } from 'vitest';

import { uniqueEmail } from '@tests/support/accountWorld';
import { courseWorld } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import { Forbidden } from '@application/errors/common';
import { ReviewCourseUseCase } from '@application/usecases/review/ReviewCourseUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let reviewCourse: ReviewCourseUseCase;
let student: Account;
let enrollment: Enrollment;

const review = (rating: number, comment = 'Good') =>
  reviewCourse.execute({
    student,
    courseId: world.course.id,
    rating,
    comment,
  });

const ratings = async () => {
  const course = await world.storedCourse();

  return [course?.ratingSum, course?.ratingCount];
};

beforeEach(async () => {
  world = await courseWorld();
  reviewCourse = new ReviewCourseUseCase(
    world.courses,
    world.enrollments,
    world.reviews,
    world.unitOfWork,
  );
  await world.setCourse({ status: 'PUBLISHED' });
  student = Account.create({ name: 'Duda', email: uniqueEmail('duda') });
  student.activate();
  enrollment = Enrollment.create({ student, course: world.course });
  const unit = world.unitOfWork();
  unit.add(world.enrollments.createOperation(enrollment));
  await unit.commit();
});

describe('ReviewCourseUseCase', () => {
  it('should create a review and count it on the course', async () => {
    await expect(review(4)).resolves.toMatchObject({
      review: { rating: 4, comment: 'Good' },
      created: true,
    });
    await expect(ratings()).resolves.toEqual([4, 1]);
  });

  it('should move the sum by the difference when the rating changes', async () => {
    await review(4);

    await expect(review(2, 'Meh')).resolves.toMatchObject({
      review: { rating: 2, comment: 'Meh' },
      created: false,
    });
    await expect(ratings()).resolves.toEqual([2, 1]);
  });

  it('should change only the comment without touching the course counters', async () => {
    await review(4);

    await review(4, 'Better than I thought');

    await expect(ratings()).resolves.toEqual([4, 1]);
    await expect(
      world.reviews.find(student.id, world.course.id),
    ).resolves.toMatchObject({ comment: 'Better than I thought' });
  });

  it('should answer an unchanged review without writing', async () => {
    const first = await review(4);

    const again = await review(4);

    expect(again).toEqual({ review: first.review, created: false });
    await expect(
      world.reviews.find(student.id, world.course.id),
    ).resolves.toMatchObject({ updatedAt: new Date(first.review.updatedAt) });
  });

  it('should still take a review in an archived course', async () => {
    await world.setCourse({ status: 'ARCHIVED' });

    await expect(review(5)).resolves.toMatchObject({ created: true });
  });

  it('should refuse a student who left', async () => {
    await review(5);
    const unit = world.unitOfWork();
    unit.add(world.enrollments.cancelOperation(enrollment));
    await unit.commit();

    await expect(review(1)).rejects.toBeInstanceOf(Forbidden);
  });
});
