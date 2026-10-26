import type { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';

// Deletes what a course marked for deletion holds, one page per call (Q371).
export interface CourseDeletionRepository {
  // `not-deleting`: the course is live, and nothing was touched.
  deleteNextPage: (
    courseId: Course.Id,
  ) => Promise<'more' | 'done' | 'not-deleting'>;
}

export namespace CourseDeletionRepository {
  export interface Page {
    // The lessons this page deletes; their objects go before it (Q417).
    readonly lessonIds: Lesson.Id[];

    // Only the course itself is left.
    readonly last: boolean;
  }
}
