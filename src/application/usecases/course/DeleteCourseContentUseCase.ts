import type { Course } from '@application/entities/course/Course';
import type { CourseDeletionQueue } from '@application/gateways/course/CourseDeletionQueue';
import type { CourseDeletionRepository } from '@application/repositories/course/CourseDeletionRepository';

// One page per message; the next page is another message, so no run grows with the course (Q371).
export class DeleteCourseContentUseCase {
  constructor(
    private readonly courseDeletion: CourseDeletionRepository,
    private readonly courseDeletionQueue: CourseDeletionQueue,
  ) {}

  async execute({
    courseId,
  }: DeleteCourseContentUseCase.Input): Promise<DeleteCourseContentUseCase.Outcome> {
    const outcome = await this.courseDeletion.deleteNextPage(courseId);

    if (outcome === 'more') {
      await this.courseDeletionQueue.enqueue([courseId]);
    }

    if (outcome === 'not-deleting') {
      console.warn(
        JSON.stringify({ event: 'CourseDeletionRefused', courseId }),
      );
    }

    return outcome;
  }
}

export namespace DeleteCourseContentUseCase {
  export interface Input {
    courseId: Course.Id;
  }

  export type Outcome = 'more' | 'done' | 'not-deleting';
}
