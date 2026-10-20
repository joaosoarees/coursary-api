import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { Course } from '@application/entities/course/Course';
import type { Module } from '@application/entities/outline/Module';
import { ModuleNotFound } from '@application/errors/outline';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { ModuleRepository } from '@application/repositories/outline/ModuleRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';
import { ModuleDetails } from '@application/usecases/outline/ModuleDetails';

export class UpdateModuleUseCase {
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
    title,
  }: UpdateModuleUseCase.Input): Promise<ModuleDetails> {
    const found = await this.coursesRepository.findById(courseId);
    const course = Course.requireFound(found);
    course.requireEditableBy(callerId, callerRole);
    const module = await this.modulesRepository.findById(courseId, moduleId);

    if (!module) {
      throw new ModuleNotFound();
    }

    module.title = title.trim();
    const unit = this.unitOfWork();
    unit.add(
      this.modulesRepository.renameOperation(module),
      this.coursesRepository.statusUnchangedOperation(course),
    );
    await unit.commit();

    return ModuleDetails.fromModule(module);
  }
}

export namespace UpdateModuleUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    moduleId: Module.Id;
    title: string;
  }
}
