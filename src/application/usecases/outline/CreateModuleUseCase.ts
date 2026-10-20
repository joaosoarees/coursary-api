import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { Course } from '@application/entities/course/Course';
import { Module } from '@application/entities/outline/Module';
import type { CourseOutlineQuery } from '@application/queries/outline/CourseOutlineQuery';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { ModuleRepository } from '@application/repositories/outline/ModuleRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';
import { ModuleDetails } from '@application/usecases/outline/ModuleDetails';

export class CreateModuleUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly modulesRepository: ModuleRepository,
    private readonly courseOutline: CourseOutlineQuery,
    private readonly unitOfWork: UnitOfWork.Factory,
  ) {}

  async execute({
    callerId,
    callerRole,
    courseId,
    title,
  }: CreateModuleUseCase.Input): Promise<ModuleDetails> {
    const found = await this.coursesRepository.findById(courseId);
    const course = Course.requireFound(found);
    course.requireEditableBy(callerId, callerRole);
    const { modules } = await this.courseOutline.execute(courseId, {
      consistent: true,
    });
    const position = Math.max(-1, ...modules.map((m) => m.position)) + 1;
    const module = Module.create({ courseId, title, position });

    const unit = this.unitOfWork();
    unit.add(
      this.modulesRepository.createOperation(module),
      this.coursesRepository.statusUnchangedOperation(course),
    );
    await unit.commit();

    return ModuleDetails.fromModule(module);
  }
}

export namespace CreateModuleUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    title: string;
  }
}
