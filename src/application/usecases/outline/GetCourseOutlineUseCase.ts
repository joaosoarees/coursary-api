import { Course } from '@application/entities/course/Course';
import type { CourseOutlineQuery } from '@application/queries/outline/CourseOutlineQuery';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';
import { CourseOutlineDetails } from '@application/usecases/outline/CourseOutlineDetails';

export class GetCourseOutlineUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly enrollmentsRepository: EnrollmentRepository,
    private readonly courseOutline: CourseOutlineQuery,
  ) {}

  async execute({
    callerId,
    callerRole,
    courseId,
  }: GetCourseOutlineUseCase.Input): Promise<CourseOutlineDetails> {
    const [found, enrollment] = await Promise.all([
      this.coursesRepository.findById(courseId),
      this.enrollmentsRepository.find(callerId, courseId),
    ]);
    const course = Course.requireFound(found);
    course.requireReadableBy(callerId, callerRole, enrollment);

    const outline = await this.courseOutline.execute(courseId);

    return CourseOutlineDetails.fromCourse(course, outline);
  }
}

export namespace GetCourseOutlineUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
  }
}
