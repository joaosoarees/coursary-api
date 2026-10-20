import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Review } from '@application/entities/review/Review';

const student = Account.create({ name: 'Bia', email: 'bia@example.com' });
const course = Course.create({
  instructor: student,
  title: 'T',
});
const review = Review.create({ student, course, rating: 4, comment: 'Good' });

describe('Review', () => {
  it('should copy the student name and stamp both dates alike', () => {
    expect(review).toMatchObject({ studentName: 'Bia', rating: 4 });
    expect(review.updatedAt).toEqual(review.createdAt);
  });

  it.each([
    ['the same rating and comment', 4, 'Good', false],
    ['another rating', 5, 'Good', true],
    ['another comment', 4, 'Great', true],
  ])('should tell whether %s changes it', (_, rating, comment, changes) => {
    expect(review.changesWith({ rating, comment })).toBe(changes);
  });
});
