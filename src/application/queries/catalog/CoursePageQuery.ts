import type { Course } from '@application/entities/course/Course';
import type { CoursePage } from '@application/queries/catalog/CoursePage';

export interface CoursePageQuery {
  execute: (courseId: Course.Id) => Promise<CoursePage | null>;
}
