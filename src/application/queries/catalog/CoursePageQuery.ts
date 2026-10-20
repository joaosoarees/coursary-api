import type { Course } from '@application/entities/course/Course';
import type { CoursePage } from '@application/queries/catalog/CoursePage';

export interface CoursePageQuery {
  // A published course with its outline, or null for anything else (Q235).
  execute: (courseId: Course.Id) => Promise<CoursePage | null>;
}
