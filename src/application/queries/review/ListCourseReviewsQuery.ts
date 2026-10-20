import type { Page } from '@application/contracts/Page';
import type { Course } from '@application/entities/course/Course';
import type { ReviewSummary } from '@application/queries/review/ReviewSummary';

export interface ListCourseReviewsQuery {
  execute: (
    input: ListCourseReviewsQuery.Input,
  ) => Promise<Page<ReviewSummary>>;
}

export namespace ListCourseReviewsQuery {
  export interface Input {
    courseId: Course.Id;
    page: Page.Options;
  }
}
