import {
  type Course,
  courseStatuses,
} from '@application/entities/course/Course';
import type { CatalogIndex } from '@application/gateways/catalog/CatalogIndex';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';

// Copies the current state, never the change that asked for it, so a late or repeated message is harmless (Q296, Q316).
export class IndexCourseUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly catalogIndex: CatalogIndex,
  ) {}

  async execute({ courseId }: IndexCourseUseCase.Input): Promise<void> {
    const strong = { consistent: true };
    const [course, description] = await Promise.all([
      this.coursesRepository.findById(courseId, strong),
      this.coursesRepository.findDescription(courseId, strong),
    ]);

    // A draft was never published, so it has no record to remove.
    if (course?.status === courseStatuses.Draft) {
      return;
    }

    if (course?.status !== courseStatuses.Published || !course.publishedAt) {
      await this.catalogIndex.remove(courseId);

      return;
    }

    await this.catalogIndex.save({
      courseId,
      title: course.title,
      description,
      instructorName: course.instructorName,
      publishedAt: course.publishedAt.toISOString(),
    });
  }
}

export namespace IndexCourseUseCase {
  export interface Input {
    courseId: Course.Id;
  }
}
