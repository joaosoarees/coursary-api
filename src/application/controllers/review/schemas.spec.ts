import { describe, expect, it } from 'vitest';

import { reviewSchema } from '@application/controllers/review/schemas';

describe('reviewSchema', () => {
  it('should trim the comment and default it to empty', () => {
    expect(reviewSchema.parse({ rating: 5, comment: ' Great ' })).toEqual({
      rating: 5,
      comment: 'Great',
    });
    expect(reviewSchema.parse({ rating: 1 })).toEqual({
      rating: 1,
      comment: '',
    });
  });

  it.each([
    ['a rating of 0', { rating: 0 }],
    ['a rating of 6', { rating: 6 }],
    ['a fractional rating', { rating: 4.5 }],
    [
      'a comment over 2,000 characters',
      { rating: 3, comment: 'x'.repeat(2001) },
    ],
  ])('should refuse %s', (_, body) => {
    expect(reviewSchema.safeParse(body).success).toBe(false);
  });
});
