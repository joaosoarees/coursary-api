import { Course } from '@application/entities/course/Course';
import { fileStatuses } from '@application/entities/file/File';
import type { Lesson } from '@application/entities/outline/Lesson';
import { VideoNotFound } from '@application/errors/file';
import { LessonNotFound } from '@application/errors/outline';
import type { FileStorage } from '@application/gateways/file/FileStorage';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { FileRepository } from '@application/repositories/file/FileRepository';
import type { LessonRepository } from '@application/repositories/outline/LessonRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

// The sent videos go, records first; an upload in progress stays, it may be the replacement.
export class DeleteVideoUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly lessonsRepository: LessonRepository,
    private readonly filesRepository: FileRepository,
    private readonly fileStorage: FileStorage,
  ) {}

  async execute({
    callerId,
    callerRole,
    courseId,
    lessonId,
  }: DeleteVideoUseCase.Input): Promise<void> {
    // The videos read strongly: one confirmed a moment ago is found too.
    const [found, content, videos] = await Promise.all([
      this.coursesRepository.findById(courseId),
      this.lessonsRepository.findContent(courseId, lessonId),
      this.filesRepository.listByOwner(
        { ownerType: 'lesson', ownerId: lessonId },
        'video',
      ),
    ]);
    const course = Course.requireFound(found);
    course.requireEditableBy(callerId, callerRole);

    if (!content) {
      throw new LessonNotFound();
    }

    const sent = videos.filter(
      (video) => video.status === fileStatuses.Uploaded,
    );

    if (sent.length === 0) {
      throw new VideoNotFound();
    }

    // An object left behind is only an unnamed file.
    await Promise.all(sent.map((video) => this.filesRepository.delete(video)));
    await Promise.all(
      sent.map((video) => this.fileStorage.deleteOriginal(video.originalKey)),
    );
  }
}

export namespace DeleteVideoUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    lessonId: Lesson.Id;
  }
}
