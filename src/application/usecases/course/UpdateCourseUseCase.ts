import { Course } from '@application/entities/course/Course';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import { CourseDetails } from '@application/usecases/course/CourseDetails';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

export class UpdateCourseUseCase {
  constructor(private readonly coursesRepository: CourseRepository) {}

  async execute({
    callerId,
    callerRole,
    courseId,
    changes,
  }: UpdateCourseUseCase.Input): Promise<CourseDetails> {
    const found = await this.coursesRepository.findById(courseId);
    const course = Course.requireFound(found);
    course.requireEditableBy(callerId, callerRole);

    const [, description] = await Promise.all([
      this.coursesRepository.update(course, changes),
      changes.description ?? this.coursesRepository.findDescription(courseId),
    ]);
    course.title = changes.title ?? course.title;

    return CourseDetails.fromCourse(course, description);
  }
}

export namespace UpdateCourseUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    changes: Course.Changes;
  }
}
