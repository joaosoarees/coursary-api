import type { Page } from '@application/contracts/Page';
import type { Account } from '@application/entities/account/Account';
import type { CourseSummary } from '@application/queries/course/CourseSummary';
import type { ListCoursesByInstructorQuery } from '@application/queries/course/ListCoursesByInstructorQuery';

export class ListMyCoursesUseCase {
  constructor(
    private readonly listCoursesByInstructor: ListCoursesByInstructorQuery,
  ) {}

  execute({
    callerId,
    limit,
    cursor,
  }: ListMyCoursesUseCase.Input): Promise<Page<CourseSummary>> {
    return this.listCoursesByInstructor.execute({
      instructorId: callerId,
      page: { limit, cursor },
    });
  }
}

export namespace ListMyCoursesUseCase {
  export interface Input extends Page.Options {
    callerId: Account.Id;
  }
}
