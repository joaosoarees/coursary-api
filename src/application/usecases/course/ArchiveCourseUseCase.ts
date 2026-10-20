import { Course } from '@application/entities/course/Course';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import { CourseDetails } from '@application/usecases/course/CourseDetails';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

export class ArchiveCourseUseCase {
  constructor(private readonly coursesRepository: CourseRepository) {}

  async execute({
    callerId,
    callerRole,
    courseId,
  }: ArchiveCourseUseCase.Input): Promise<CourseDetails> {
    const found = await this.coursesRepository.findById(courseId);
    const course = Course.requireFound(found);
    course.requireEditableBy(callerId, callerRole);

    const [archived, description] = await Promise.all([
      this.coursesRepository.archive(courseId),
      this.coursesRepository.findDescription(courseId),
    ]);

    return CourseDetails.fromCourse(archived, description);
  }
}

export namespace ArchiveCourseUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
  }
}
