import type { Page } from '@application/contracts/Page';
import type { Account } from '@application/entities/account/Account';
import type { CourseSummary } from '@application/queries/course/CourseSummary';

export interface ListCoursesByInstructorQuery {
  execute: (
    input: ListCoursesByInstructorQuery.Input,
  ) => Promise<Page<CourseSummary>>;
}

export namespace ListCoursesByInstructorQuery {
  export interface Input {
    instructorId: Account.Id;
    page: Page.Options;
  }
}
