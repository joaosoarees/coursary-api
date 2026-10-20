import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { CoursePosition } from '@application/entities/enrollment/CoursePosition';
import type { LessonProgress } from '@application/entities/enrollment/LessonProgress';

export interface ProgressRepository {
  // Fails with AlreadyCompleted when the lesson was completed before.
  completeOperation: (progress: LessonProgress) => UnitOfWork.Operation;

  // Overwrites the student's single position in the course.
  savePosition: (position: CoursePosition) => Promise<void>;
}
