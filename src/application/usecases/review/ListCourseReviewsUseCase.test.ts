import { beforeEach, describe, expect, it } from 'vitest';

import { uniqueEmail } from '@tests/support/accountWorld';
import { courseWorld } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { Review } from '@application/entities/review/Review';
import { CourseNotFound } from '@application/errors/course';
import { ListCourseReviewsUseCase } from '@application/usecases/review/ListCourseReviewsUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let listReviews: ListCourseReviewsUseCase;

// A review by a new student, created on the given day of 2026.
const reviewOn = async (name: string, day: number, rating: number) => {
  const student = Account.create({ name, email: uniqueEmail(name) });
  const date = new Date(Date.UTC(2026, 0, day));
  const review = new Review({
    accountId: student.id,
    courseId: world.course.id,
    studentName: name,
    rating,
    comment: name,
    createdAt: date,
    updatedAt: date,
  });
  const unit = world.unitOfWork();
  unit.add(world.reviews.createOperation(review));
  await unit.commit();
};

const list = (cursor?: string) =>
  listReviews.execute({ courseId: world.course.id, limit: 1, cursor });

beforeEach(async () => {
  world = await courseWorld();
  listReviews = new ListCourseReviewsUseCase(
    world.courses,
    world.courseReviews,
  );
});

describe('ListCourseReviewsUseCase', () => {
  it('should list the reviews of a published course, newest first, without account ids', async () => {
    await world.setCourse({ status: 'PUBLISHED' });
    await reviewOn('Bia', 1, 4);
    await reviewOn('Caio', 2, 5);

    const first = await list();
    const second = await list(first.nextCursor ?? undefined);

    expect([...first.items, ...second.items]).toEqual([
      expect.objectContaining({ studentName: 'Caio', rating: 5 }),
      expect.objectContaining({ studentName: 'Bia', rating: 4 }),
    ]);
    expect(first.items[0]).not.toHaveProperty('accountId');
  });

  it('should answer not found for a draft or an archived course', async () => {
    await expect(list()).rejects.toBeInstanceOf(CourseNotFound);

    await world.setCourse({ status: 'ARCHIVED' });
    await expect(list()).rejects.toBeInstanceOf(CourseNotFound);
  });
});
