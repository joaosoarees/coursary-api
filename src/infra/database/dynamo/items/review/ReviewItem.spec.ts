import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Review } from '@application/entities/review/Review';
import { ReviewItem } from '@infra/database/dynamo/items/review/ReviewItem';

const student = Account.create({ name: 'Bia', email: 'bia@example.com' });
const course = Course.create({
  instructor: student,
  title: 'T',
});

describe('ReviewItem', () => {
  it('should keep the review in the student partition and list it under the course', () => {
    const review = Review.create({ student, course, rating: 5, comment: 'Ok' });

    expect(ReviewItem.fromEntity(review).toItem()).toMatchObject({
      PK: `ACCOUNT#${student.id}`,
      SK: `REVIEW#${course.id}`,
      GSI1PK: `COURSE#${course.id}`,
      GSI1SK: `REVIEW#${review.createdAt.toISOString()}#${student.id}`,
      type: 'Review',
    });
  });

  it('should come back as the same review', () => {
    const review = Review.create({ student, course, rating: 3, comment: '' });

    expect(ReviewItem.toEntity(ReviewItem.fromEntity(review).toItem())).toEqual(
      review,
    );
  });
});
