import type { Review } from '@application/entities/review/Review';

export class ReviewDetails {
  readonly courseId: string;
  readonly rating: number;
  readonly comment: string;
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(attributes: ReviewDetails) {
    this.courseId = attributes.courseId;
    this.rating = attributes.rating;
    this.comment = attributes.comment;
    this.createdAt = attributes.createdAt;
    this.updatedAt = attributes.updatedAt;
  }

  static fromReview(review: Review): ReviewDetails {
    return new ReviewDetails({
      courseId: review.courseId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    });
  }
}
