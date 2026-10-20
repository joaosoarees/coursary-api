import type { Course } from '@application/entities/course/Course';
import type { CourseOutline } from '@application/queries/outline/CourseOutline';

export interface CourseOutlineQuery {
  execute: (
    courseId: Course.Id,
    options?: CourseOutlineQuery.ReadOptions,
  ) => Promise<CourseOutline>;
}

export namespace CourseOutlineQuery {
  // Editing decides on what it reads, so it reads strongly (Q288).
  export interface ReadOptions {
    consistent?: boolean;
  }
}
