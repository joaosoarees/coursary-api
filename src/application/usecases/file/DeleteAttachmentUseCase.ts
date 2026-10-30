import { Course } from '@application/entities/course/Course';
import { File } from '@application/entities/file/File';
import type { Lesson } from '@application/entities/outline/Lesson';
import { AttachmentNotFound } from '@application/errors/file';
import { LessonNotFound } from '@application/errors/outline';
import type { FileStorage } from '@application/gateways/file/FileStorage';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { FileRepository } from '@application/repositories/file/FileRepository';
import type { LessonRepository } from '@application/repositories/outline/LessonRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

// The record goes first; an object left behind is only an unnamed file.
export class DeleteAttachmentUseCase {
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
    fileId,
  }: DeleteAttachmentUseCase.Input): Promise<void> {
    const [found, content] = await Promise.all([
      this.coursesRepository.findById(courseId),
      this.lessonsRepository.findContent(courseId, lessonId),
    ]);
    const course = Course.requireFound(found);
    course.requireEditableBy(callerId, callerRole);

    if (!content) {
      throw new LessonNotFound();
    }

    const reference: File.Reference = {
      ownerType: 'lesson',
      ownerId: lessonId,
      purpose: 'attachment',
      id: fileId,
    };

    if (!(await this.filesRepository.delete(reference))) {
      throw new AttachmentNotFound();
    }

    await this.fileStorage.deleteOriginal(File.originalKeyOf(reference));
  }
}

export namespace DeleteAttachmentUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    lessonId: Lesson.Id;
    fileId: File.Id;
  }
}
