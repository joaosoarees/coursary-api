import type { Page } from '@application/contracts/Page';
import type { Course } from '@application/entities/course/Course';
import type { StudentSummary } from '@application/queries/enrollment/StudentSummary';

export interface ListCourseStudentsQuery {
  execute: (
    input: ListCourseStudentsQuery.Input,
  ) => Promise<Page<StudentSummary>>;
}

export namespace ListCourseStudentsQuery {
  export interface Input {
    courseId: Course.Id;
    page: Page.Options;
  }
}
