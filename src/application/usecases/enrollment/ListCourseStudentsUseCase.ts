import type { Page } from '@application/contracts/Page';
import { Course } from '@application/entities/course/Course';
import type { ListCourseStudentsQuery } from '@application/queries/enrollment/ListCourseStudentsQuery';
import type { StudentSummary } from '@application/queries/enrollment/StudentSummary';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

export class ListCourseStudentsUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly listCourseStudents: ListCourseStudentsQuery,
  ) {}

  // The owner or an admin, archived courses included (Q270).
  async execute({
    callerId,
    callerRole,
    courseId,
    limit,
    cursor,
  }: ListCourseStudentsUseCase.Input): Promise<Page<StudentSummary>> {
    const found = await this.coursesRepository.findById(courseId);
    const course = Course.requireFound(found);
    course.requireManagedBy(callerId, callerRole);

    return this.listCourseStudents.execute({
      courseId,
      page: { limit, cursor },
    });
  }
}

export namespace ListCourseStudentsUseCase {
  export interface Input extends CourseEditor, Page.Options {
    courseId: Course.Id;
  }
}
