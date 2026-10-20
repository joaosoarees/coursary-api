import type { Page } from '@application/contracts/Page';
import {
  type Course,
  courseStatuses,
} from '@application/entities/course/Course';
import { CourseNotFound } from '@application/errors/course';
import type { ListCourseReviewsQuery } from '@application/queries/review/ListCourseReviewsQuery';
import type { ReviewSummary } from '@application/queries/review/ReviewSummary';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';

export class ListCourseReviewsUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly listCourseReviews: ListCourseReviewsQuery,
  ) {}

  // Public, like the course page: only a published course (Q235, Q283).
  async execute({
    courseId,
    limit,
    cursor,
  }: ListCourseReviewsUseCase.Input): Promise<Page<ReviewSummary>> {
    const course = await this.coursesRepository.findById(courseId);

    if (course?.status !== courseStatuses.Published) {
      throw new CourseNotFound();
    }

    return this.listCourseReviews.execute({
      courseId,
      page: { limit, cursor },
    });
  }
}

export namespace ListCourseReviewsUseCase {
  export interface Input extends Page.Options {
    courseId: Course.Id;
  }
}
