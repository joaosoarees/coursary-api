import { Course, courseStatuses } from '@application/entities/course/Course';
import { CourseNotDraft } from '@application/errors/course';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

export class DeleteCourseUseCase {
  constructor(private readonly coursesRepository: CourseRepository) {}

  async execute({
    callerId,
    callerRole,
    courseId,
  }: DeleteCourseUseCase.Input): Promise<DeleteCourseUseCase.Output> {
    const found = await this.coursesRepository.findById(courseId);
    const course = Course.requireFound(found);
    course.requireManagedBy(callerId, callerRole);

    if (course.status !== courseStatuses.Draft) {
      throw new CourseNotDraft();
    }

    await this.coursesRepository.markDeleting(courseId);

    return { id: courseId, status: 'DELETING' };
  }
}

export namespace DeleteCourseUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
  }

  export interface Output {
    id: string;
    status: 'DELETING';
  }
}
