import type { Course } from '@application/entities/course/Course';

export interface CourseDeletionQueue {
  enqueue: (courseIds: Course.Id[]) => Promise<void>;
}
