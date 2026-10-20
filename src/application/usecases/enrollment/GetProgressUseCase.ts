import { Course } from '@application/entities/course/Course';
import type { CourseProgressQuery } from '@application/queries/enrollment/CourseProgressQuery';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';
import { ProgressDetails } from '@application/usecases/enrollment/ProgressDetails';

export class GetProgressUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly enrollmentsRepository: EnrollmentRepository,
    private readonly courseProgress: CourseProgressQuery,
  ) {}

  // The count comes from the enrollment, the rest from one Query (Q279).
  async execute({
    callerId,
    callerRole,
    courseId,
  }: GetProgressUseCase.Input): Promise<ProgressDetails> {
    const [found, stored, progress] = await Promise.all([
      this.coursesRepository.findById(courseId),
      this.enrollmentsRepository.find(callerId, courseId),
      this.courseProgress.execute({ accountId: callerId, courseId }),
    ]);
    const course = Course.requireFound(found);
    const enrollment = course.requireEnrolledIn(callerId, callerRole, stored);

    return new ProgressDetails({
      completedLessons: enrollment.completedLessons,
      ...progress,
    });
  }
}

export namespace GetProgressUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
  }
}
