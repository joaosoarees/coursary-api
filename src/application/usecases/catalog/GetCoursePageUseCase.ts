import type { Course } from '@application/entities/course/Course';
import { CourseNotFound } from '@application/errors/course';
import type { CoursePage } from '@application/queries/catalog/CoursePage';
import type { CoursePageQuery } from '@application/queries/catalog/CoursePageQuery';

export class GetCoursePageUseCase {
  constructor(private readonly coursePage: CoursePageQuery) {}

  async execute({ courseId }: GetCoursePageUseCase.Input): Promise<CoursePage> {
    const page = await this.coursePage.execute(courseId);

    if (!page) {
      throw new CourseNotFound();
    }

    return page;
  }
}

export namespace GetCoursePageUseCase {
  export interface Input {
    courseId: Course.Id;
  }
}
