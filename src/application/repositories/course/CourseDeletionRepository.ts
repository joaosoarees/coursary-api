import type { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';

// Deletes what a course marked for deletion holds, one page per call (Q371).
export interface CourseDeletionRepository {
  // Reads without deleting. `done`: the course is gone; `not-deleting`: it is live.
  nextPage: (
    courseId: Course.Id,
  ) => Promise<CourseDeletionRepository.Page | 'done' | 'not-deleting'>;

  // Deletes the page as it was read; a repeated one is harmless.
  deletePage: (page: CourseDeletionRepository.Page) => Promise<void>;
}

export namespace CourseDeletionRepository {
  export interface Page {
    // The lessons this page deletes; their objects go before it (Q417).
    readonly lessonIds: Lesson.Id[];

    // Only the course itself is left.
    readonly last: boolean;
  }
}
