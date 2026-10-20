import type { Course } from '@application/entities/course/Course';

// Deletes what a course marked for deletion holds, one page per call (Q371).
export interface CourseDeletionRepository {
  // `not-deleting`: the course is live, and nothing was touched.
  deleteNextPage: (
    courseId: Course.Id,
  ) => Promise<'more' | 'done' | 'not-deleting'>;
}
