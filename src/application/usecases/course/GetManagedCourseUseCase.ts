import { Course } from '@application/entities/course/Course';
import type { PublicAssetUrls } from '@application/gateways/file/PublicAssetUrls';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import { CourseDetails } from '@application/usecases/course/CourseDetails';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

export class GetManagedCourseUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly assetUrls: PublicAssetUrls,
  ) {}

  // Strong reads: the editor reads the course right after a save or a processed cover.
  async execute({
    callerId,
    callerRole,
    courseId,
  }: GetManagedCourseUseCase.Input): Promise<CourseDetails> {
    const [found, description] = await Promise.all([
      this.coursesRepository.findById(courseId, { consistent: true }),
      this.coursesRepository.findDescription(courseId, { consistent: true }),
    ]);
    const course = Course.requireFound(found);
    course.requireManagedBy(callerId, callerRole);

    return CourseDetails.fromCourse(course, description, this.assetUrls);
  }
}

export namespace GetManagedCourseUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
  }
}
