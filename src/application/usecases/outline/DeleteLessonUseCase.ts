import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { Course } from '@application/entities/course/Course';
import type { File } from '@application/entities/file/File';
import type { Lesson } from '@application/entities/outline/Lesson';
import type { Module } from '@application/entities/outline/Module';
import { LessonNotFound } from '@application/errors/outline';
import type { FileStorage } from '@application/gateways/file/FileStorage';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { FileRepository } from '@application/repositories/file/FileRepository';
import type { LessonRepository } from '@application/repositories/outline/LessonRepository';
import type { ModuleRepository } from '@application/repositories/outline/ModuleRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

export class DeleteLessonUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly modulesRepository: ModuleRepository,
    private readonly lessonsRepository: LessonRepository,
    private readonly unitOfWork: UnitOfWork.Factory,
    private readonly fileStorage: FileStorage,
    private readonly filesRepository: FileRepository,
  ) {}

  async execute({
    callerId,
    callerRole,
    courseId,
    moduleId,
    lessonId,
  }: DeleteLessonUseCase.Input): Promise<void> {
    const found = await this.coursesRepository.findById(courseId);
    const course = Course.requireFound(found);
    course.requireEditableBy(callerId, callerRole);
    course.requireDraft();
    const lesson = await this.lessonsRepository.findById(
      courseId,
      moduleId,
      lessonId,
    );

    if (!lesson) {
      throw new LessonNotFound();
    }

    const unit = this.unitOfWork();
    unit.add(
      ...this.lessonsRepository.deleteOperations(lesson),
      this.modulesRepository.addLessonsOperation(courseId, moduleId, -1),
      this.coursesRepository.addLessonsOperation(course, -1),
    );
    await unit.commit();
    await this.deleteMaterial(lesson.id);
  }

  // Records first: an upload landing meanwhile finds none and processUpload deletes it.
  // What fails is left where no route reaches it (Q416, Q421).
  private async deleteMaterial(lessonId: Lesson.Id): Promise<void> {
    const owner: File.Owner = { ownerType: 'lesson', ownerId: lessonId };

    try {
      await this.filesRepository.deleteByOwner(owner);
      await this.fileStorage.deleteOwnerFiles(owner);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'LessonMaterialLeft',
          lessonId,
          error: String(error),
        }),
      );
    }
  }
}

export namespace DeleteLessonUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    moduleId: Module.Id;
    lessonId: Lesson.Id;
  }
}
