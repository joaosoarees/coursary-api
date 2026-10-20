import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { Course } from '@application/entities/course/Course';
import { Lesson } from '@application/entities/outline/Lesson';
import type { Module } from '@application/entities/outline/Module';
import { ModuleNotFound } from '@application/errors/outline';
import type { CourseOutlineQuery } from '@application/queries/outline/CourseOutlineQuery';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { LessonRepository } from '@application/repositories/outline/LessonRepository';
import type { ModuleRepository } from '@application/repositories/outline/ModuleRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';
import { LessonDetails } from '@application/usecases/outline/LessonDetails';

export class CreateLessonUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly modulesRepository: ModuleRepository,
    private readonly lessonsRepository: LessonRepository,
    private readonly courseOutline: CourseOutlineQuery,
    private readonly unitOfWork: UnitOfWork.Factory,
  ) {}

  async execute({
    callerId,
    callerRole,
    courseId,
    moduleId,
    ...content
  }: CreateLessonUseCase.Input): Promise<LessonDetails> {
    const found = await this.coursesRepository.findById(courseId);
    const course = Course.requireFound(found);
    course.requireEditableBy(callerId, callerRole);
    const { modules } = await this.courseOutline.execute(courseId, {
      consistent: true,
    });
    const module = modules.find((m) => m.id === moduleId);

    if (!module) {
      throw new ModuleNotFound();
    }

    const position = Math.max(-1, ...module.lessons.map((l) => l.position)) + 1;
    const lesson = Lesson.create({ courseId, moduleId, position, ...content });

    const unit = this.unitOfWork();
    unit.add(
      ...this.lessonsRepository.createOperations(lesson),
      this.modulesRepository.addLessonsOperation(courseId, moduleId, 1),
      this.coursesRepository.addLessonsOperation(course, 1),
    );
    await unit.commit();

    return LessonDetails.fromLesson(lesson);
  }
}

export namespace CreateLessonUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    moduleId: Module.Id;
    title: string;
    body: string;
    durationMinutes: number;
  }
}
