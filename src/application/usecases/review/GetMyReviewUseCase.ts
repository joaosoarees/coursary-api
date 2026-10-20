import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import { ReviewNotFound } from '@application/errors/review';
import type { ReviewRepository } from '@application/repositories/review/ReviewRepository';
import { ReviewDetails } from '@application/usecases/review/ReviewDetails';

export class GetMyReviewUseCase {
  constructor(private readonly reviewsRepository: ReviewRepository) {}

  // The student's own review, even after leaving the course (Q284).
  async execute({
    callerId,
    courseId,
  }: GetMyReviewUseCase.Input): Promise<ReviewDetails> {
    const review = await this.reviewsRepository.find(callerId, courseId);

    if (!review) {
      throw new ReviewNotFound();
    }

    return ReviewDetails.fromReview(review);
  }
}

export namespace GetMyReviewUseCase {
  export interface Input {
    callerId: Account.Id;
    courseId: Course.Id;
  }
}
