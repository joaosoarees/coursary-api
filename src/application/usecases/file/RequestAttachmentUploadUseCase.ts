import { Course } from '@application/entities/course/Course';
import { File, fileStatuses } from '@application/entities/file/File';
import type { Lesson } from '@application/entities/outline/Lesson';
import { AttachmentLimit } from '@application/errors/file';
import { LessonNotFound } from '@application/errors/outline';
import type { FileStorage } from '@application/gateways/file/FileStorage';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { FileRepository } from '@application/repositories/file/FileRepository';
import type { LessonRepository } from '@application/repositories/outline/LessonRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

// Whoever may edit the course adds material to a lesson, up to the limit (Q406 to Q408).
export class RequestAttachmentUploadUseCase {
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
    contentType,
    fileName,
  }: RequestAttachmentUploadUseCase.Input): Promise<RequestAttachmentUploadUseCase.Output> {
    const [found, content, existing] = await Promise.all([
      this.coursesRepository.findById(courseId),
      this.lessonsRepository.findContent(courseId, lessonId),
      this.filesRepository.listByOwner(
        { ownerType: 'lesson', ownerId: lessonId },
        'attachment',
      ),
    ]);
    const course = Course.requireFound(found);
    course.requireEditableBy(callerId, callerRole);

    if (!content) {
      throw new LessonNotFound();
    }

    // Failed uploads hold no place; pending ones do until their time runs out.
    const held = existing.filter((file) => file.status !== fileStatuses.Failed);
    const { maxBytes, maxPerOwner = Infinity } = File.ruleOf('attachment');

    if (held.length >= maxPerOwner) {
      throw new AttachmentLimit();
    }

    const position =
      Math.max(-1, ...existing.map((file) => file.position ?? 0)) + 1;
    const file = File.create({
      ownerId: lessonId,
      purpose: 'attachment',
      contentType,
      name: fileName,
      position,
    });
    await this.filesRepository.create(file);

    const { url, fields } = await this.fileStorage.signUpload({
      key: file.originalKey,
      contentType,
      maxBytes,
    });

    return { fileId: file.id, url, fields };
  }
}

export namespace RequestAttachmentUploadUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    lessonId: Lesson.Id;
    contentType: string;
    fileName: string;
  }

  export interface Output {
    fileId: File.Id;
    url: string;
    fields: Record<string, string>;
  }
}
