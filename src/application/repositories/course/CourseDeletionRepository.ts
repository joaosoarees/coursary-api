import type { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';

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
    // The lessons this page deletes; their objects go before it.
    readonly lessonIds: Lesson.Id[];

    readonly last: boolean;
  }
}
