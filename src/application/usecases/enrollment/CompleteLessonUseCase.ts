import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { Course } from '@application/entities/course/Course';
import { LessonProgress } from '@application/entities/enrollment/LessonProgress';
import type { Lesson } from '@application/entities/outline/Lesson';
import { AlreadyCompleted } from '@application/errors/enrollment';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';
import type { ProgressRepository } from '@application/repositories/enrollment/ProgressRepository';
import type { LessonRepository } from '@application/repositories/outline/LessonRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

export class CompleteLessonUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly enrollmentsRepository: EnrollmentRepository,
    private readonly lessonsRepository: LessonRepository,
    private readonly progressRepository: ProgressRepository,
    private readonly unitOfWork: UnitOfWork.Factory,
  ) {}

  // Completing twice answers the same without writing (Q9, Q278).
  async execute({
    callerId,
    callerRole,
    courseId,
    lessonId,
  }: CompleteLessonUseCase.Input): Promise<CompleteLessonUseCase.Output> {
    const [found, stored] = await Promise.all([
      this.coursesRepository.findById(courseId),
      this.enrollmentsRepository.find(callerId, courseId),
    ]);
    const course = Course.requireFound(found);
    const enrollment = course.requireEnrolledIn(callerId, callerRole, stored);

    const unit = this.unitOfWork();
    unit.add(
      this.progressRepository.completeOperation(
        LessonProgress.create({ enrollment, lessonId }),
      ),
      this.enrollmentsRepository.addCompletedLessonsOperation(enrollment, 1),
      this.lessonsRepository.inCourseOperation(courseId, lessonId),
    );

    try {
      await unit.commit();
    } catch (error) {
      if (error instanceof AlreadyCompleted) {
        return {
          lessonId,
          completedLessons: enrollment.completedLessons,
          created: false,
        };
      }

      throw error;
    }

    return {
      lessonId,
      completedLessons: enrollment.completedLessons + 1,
      created: true,
    };
  }
}

export namespace CompleteLessonUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    lessonId: Lesson.Id;
  }

  export interface Output {
    lessonId: Lesson.Id;
    completedLessons: number;
    created: boolean;
  }
}
