import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Course } from '@application/entities/course/Course';
import type { Module } from '@application/entities/outline/Module';

export interface ModuleRepository {
  findById: (courseId: Course.Id, id: Module.Id) => Promise<Module | null>;

  createOperation: (module: Module) => UnitOfWork.Operation;

  renameOperation: (module: Module) => UnitOfWork.Operation;

  // Only an empty module goes: ModuleNotEmpty or ModuleNotFound otherwise.
  deleteOperation: (module: Module) => UnitOfWork.Operation;

  // Moves the module and, in the same update, its lesson count.
  repositionOperation: (
    module: Module,
    lessonsDelta?: number,
  ) => UnitOfWork.Operation;

  // Counts lessons in a module that must still exist (ModuleNotFound).
  addLessonsOperation: (
    courseId: Course.Id,
    id: Module.Id,
    delta: number,
  ) => UnitOfWork.Operation;
}
