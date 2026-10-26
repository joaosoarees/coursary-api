import type { Course } from '@application/entities/course/Course';
import type { CourseDeletionQueue } from '@application/gateways/course/CourseDeletionQueue';
import type { FileStorage } from '@application/gateways/file/FileStorage';
import type { CourseDeletionRepository } from '@application/repositories/course/CourseDeletionRepository';

// One page per message; the next page is another message, so no run grows with the course (Q371).
// Objects go before the records that name them, so a repeated message still finds them (Q417).
export class DeleteCourseContentUseCase {
  constructor(
    private readonly courseDeletion: CourseDeletionRepository,
    private readonly courseDeletionQueue: CourseDeletionQueue,
    private readonly fileStorage: FileStorage,
  ) {}

  async execute({
    courseId,
  }: DeleteCourseContentUseCase.Input): Promise<DeleteCourseContentUseCase.Outcome> {
    const page = await this.courseDeletion.nextPage(courseId);

    if (page === 'not-deleting') {
      console.warn(
        JSON.stringify({ event: 'CourseDeletionRefused', courseId }),
      );

      return page;
    }

    if (page === 'done') {
      return page;
    }

    if (page.last) {
      await this.fileStorage.deleteOwnerFiles({
        ownerType: 'course',
        ownerId: courseId,
      });
      await this.courseDeletion.deletePage(page);

      return 'done';
    }

    await Promise.all(
      page.lessonIds.map((lessonId) =>
        this.fileStorage.deleteOwnerFiles({
          ownerType: 'lesson',
          ownerId: lessonId,
        }),
      ),
    );
    await this.courseDeletion.deletePage(page);
    await this.courseDeletionQueue.enqueue([courseId]);

    return 'more';
  }
}

export namespace DeleteCourseContentUseCase {
  export interface Input {
    courseId: Course.Id;
  }

  export type Outcome = 'more' | 'done' | 'not-deleting';
}
