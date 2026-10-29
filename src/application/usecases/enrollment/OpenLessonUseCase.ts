import { Course } from '@application/entities/course/Course';
import { File } from '@application/entities/file/File';
import type { Lesson } from '@application/entities/outline/Lesson';
import { LessonNotFound } from '@application/errors/outline';
import type { FileStorage } from '@application/gateways/file/FileStorage';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';
import type { LessonRepository } from '@application/repositories/outline/LessonRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';
import { LessonContentDetails } from '@application/usecases/enrollment/LessonContentDetails';

export class OpenLessonUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly enrollmentsRepository: EnrollmentRepository,
    private readonly lessonsRepository: LessonRepository,
    private readonly fileStorage: FileStorage,
  ) {}

  // The three reads do not depend on each other; nothing is returned before
  // the caller is allowed in (Q240, Q273, Q275).
  async execute({
    callerId,
    callerRole,
    courseId,
    lessonId,
  }: OpenLessonUseCase.Input): Promise<LessonContentDetails> {
    const [found, enrollment, content] = await Promise.all([
      this.coursesRepository.findById(courseId),
      this.enrollmentsRepository.find(callerId, courseId),
      this.lessonsRepository.findContent(courseId, lessonId),
    ]);
    const course = Course.requireFound(found);
    course.requireReadableBy(callerId, callerRole, enrollment);

    if (!content) {
      throw new LessonNotFound();
    }

    // Signing calls no AWS: whoever may open the lesson gets the video with it (Q438, Q451).
    const video = File.currentOf(content.videos);
    const playback = video
      ? await this.fileStorage.signPlayback({
          key: video.originalKey,
          contentType: video.contentType,
        })
      : undefined;

    return LessonContentDetails.fromContent(content, playback);
  }
}

export namespace OpenLessonUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    lessonId: Lesson.Id;
  }
}
