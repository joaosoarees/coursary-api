import type { Review } from '@application/entities/review/Review';

// What the public list shows: no account id (Q283).
export class ReviewSummary {
  readonly studentName: string;
  readonly rating: number;
  readonly comment: string;
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(attributes: ReviewSummary) {
    this.studentName = attributes.studentName;
    this.rating = attributes.rating;
    this.comment = attributes.comment;
    this.createdAt = attributes.createdAt;
    this.updatedAt = attributes.updatedAt;
  }

  static fromReview(review: Review): ReviewSummary {
    return new ReviewSummary({
      studentName: review.studentName,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    });
  }
}
