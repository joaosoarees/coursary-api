import { Course } from '@application/entities/course/Course';
import { CoursePosition } from '@application/entities/enrollment/CoursePosition';
import type { Lesson } from '@application/entities/outline/Lesson';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';
import type { ProgressRepository } from '@application/repositories/enrollment/ProgressRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

export class SavePositionUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly enrollmentsRepository: EnrollmentRepository,
    private readonly progressRepository: ProgressRepository,
  ) {}

  // Called every 15 to 30 s: one read and a put, no transaction; the lesson id
  // is only stored (Q55, Q280). An active enrollment already proves the course
  // is visible (a course never goes back to draft), so the course is read only
  // to word a refusal.
  async execute({
    callerId,
    callerRole,
    courseId,
    lessonId,
    positionSeconds,
  }: SavePositionUseCase.Input): Promise<void> {
    const enrollment = await this.enrollmentsRepository.find(
      callerId,
      courseId,
    );

    if (!enrollment?.isActive()) {
      const found = await this.coursesRepository.findById(courseId);
      Course.requireFound(found).requireEnrolledIn(
        callerId,
        callerRole,
        enrollment,
      );
    }

    await this.progressRepository.savePosition(
      CoursePosition.create({
        accountId: callerId,
        courseId,
        lessonId,
        positionSeconds,
      }),
    );
  }
}

export namespace SavePositionUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    lessonId: Lesson.Id;
    positionSeconds: number;
  }
}
