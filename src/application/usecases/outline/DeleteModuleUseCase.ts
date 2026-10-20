import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { Course } from '@application/entities/course/Course';
import type { Module } from '@application/entities/outline/Module';
import { ModuleNotEmpty, ModuleNotFound } from '@application/errors/outline';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { ModuleRepository } from '@application/repositories/outline/ModuleRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

export class DeleteModuleUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly modulesRepository: ModuleRepository,
    private readonly unitOfWork: UnitOfWork.Factory,
  ) {}

  async execute({
    callerId,
    callerRole,
    courseId,
    moduleId,
  }: DeleteModuleUseCase.Input): Promise<void> {
    const found = await this.coursesRepository.findById(courseId);
    const course = Course.requireFound(found);
    course.requireEditableBy(callerId, callerRole);
    course.requireDraft();
    const module = await this.modulesRepository.findById(courseId, moduleId);

    if (!module) {
      throw new ModuleNotFound();
    }

    // The count is read strongly here and held again by the delete (Q288).
    if (module.lessonCount > 0) {
      throw new ModuleNotEmpty();
    }

    const unit = this.unitOfWork();
    unit.add(
      this.modulesRepository.deleteOperation(module),
      this.coursesRepository.statusUnchangedOperation(course),
    );
    await unit.commit();
  }
}

export namespace DeleteModuleUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    moduleId: Module.Id;
  }
}
