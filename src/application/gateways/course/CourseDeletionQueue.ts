import type { Course } from '@application/entities/course/Course';

// Asks for the next page of a course marked for deletion to be deleted (Q370, Q371).
export interface CourseDeletionQueue {
  enqueue: (courseIds: Course.Id[]) => Promise<void>;
}
