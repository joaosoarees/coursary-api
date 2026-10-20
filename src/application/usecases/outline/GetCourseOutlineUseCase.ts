import { Course } from '@application/entities/course/Course';
import type { CourseOutline } from '@application/queries/outline/CourseOutline';
import type { CourseOutlineQuery } from '@application/queries/outline/CourseOutlineQuery';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

export class GetCourseOutlineUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly enrollmentsRepository: EnrollmentRepository,
    private readonly courseOutline: CourseOutlineQuery,
  ) {}

  // Whoever may open its lessons sees the outline, archived included (Q274).
  async execute({
    callerId,
    callerRole,
    courseId,
  }: GetCourseOutlineUseCase.Input): Promise<CourseOutline> {
    const [found, enrollment] = await Promise.all([
      this.coursesRepository.findById(courseId),
      this.enrollmentsRepository.find(callerId, courseId),
    ]);
    const course = Course.requireFound(found);
    course.requireReadableBy(callerId, callerRole, enrollment);

    return this.courseOutline.execute(courseId);
  }
}

export namespace GetCourseOutlineUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
  }
}
