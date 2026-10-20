import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';
import type { Module } from '@application/entities/outline/Module';
import { LessonNotFound } from '@application/errors/outline';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { LessonRepository } from '@application/repositories/outline/LessonRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';
import { LessonDetails } from '@application/usecases/outline/LessonDetails';

export class UpdateLessonUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly lessonsRepository: LessonRepository,
    private readonly unitOfWork: UnitOfWork.Factory,
  ) {}

  async execute({
    callerId,
    callerRole,
    courseId,
    moduleId,
    lessonId,
    changes,
  }: UpdateLessonUseCase.Input): Promise<LessonDetails> {
    const found = await this.coursesRepository.findById(courseId);
    const course = Course.requireFound(found);
    course.requireEditableBy(callerId, callerRole);
    const lesson = await this.lessonsRepository.findById(
      courseId,
      moduleId,
      lessonId,
    );

    if (!lesson) {
      throw new LessonNotFound();
    }

    lesson.title = changes.title?.trim() ?? lesson.title;
    lesson.body = changes.body ?? lesson.body;
    lesson.durationMinutes = changes.durationMinutes ?? lesson.durationMinutes;
    const unit = this.unitOfWork();
    unit.add(
      ...this.lessonsRepository.updateOperations(lesson, {
        bodyChanged: changes.body !== undefined,
      }),
      this.coursesRepository.statusUnchangedOperation(course),
    );
    await unit.commit();

    return LessonDetails.fromLesson(lesson);
  }
}

export namespace UpdateLessonUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    moduleId: Module.Id;
    lessonId: Lesson.Id;
    changes: Lesson.Changes;
  }
}
