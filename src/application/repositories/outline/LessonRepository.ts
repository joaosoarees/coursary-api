import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';
import type { Module } from '@application/entities/outline/Module';

export interface LessonRepository {
  findById: (
    courseId: Course.Id,
    moduleId: Module.Id,
    id: Lesson.Id,
  ) => Promise<Lesson | null>;

  // The body alone, without knowing the module; null when not in the course.
  findContent: (
    courseId: Course.Id,
    id: Lesson.Id,
  ) => Promise<LessonRepository.Content | null>;

  // Holds the transaction to a lesson that still exists in the course; fails
  // with LessonNotFound otherwise.
  inCourseOperation: (
    courseId: Course.Id,
    id: Lesson.Id,
  ) => UnitOfWork.Operation;

  createOperations: (lesson: Lesson) => UnitOfWork.Operation[];

  // Rewrites the body only when it changed: it can take 32 KiB (Q287).
  updateOperations: (
    lesson: Lesson,
    { bodyChanged }: { bodyChanged: boolean },
  ) => UnitOfWork.Operation[];

  deleteOperations: (lesson: Lesson) => UnitOfWork.Operation[];

  repositionOperation: (lesson: Lesson) => UnitOfWork.Operation;

  moveOperations: (
    lesson: Lesson,
    fromModuleId: Module.Id,
  ) => UnitOfWork.Operation[];
}

export namespace LessonRepository {
  export interface Content {
    lessonId: Lesson.Id;
    courseId: Course.Id;
    body: string;
  }
}
