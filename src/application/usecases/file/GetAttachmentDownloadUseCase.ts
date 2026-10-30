import { Course } from '@application/entities/course/Course';
import { File, fileStatuses } from '@application/entities/file/File';
import type { Lesson } from '@application/entities/outline/Lesson';
import { AttachmentNotFound } from '@application/errors/file';
import { LessonNotFound } from '@application/errors/outline';
import type { FileStorage } from '@application/gateways/file/FileStorage';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';
import type { FileRepository } from '@application/repositories/file/FileRepository';
import type { LessonRepository } from '@application/repositories/outline/LessonRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

export class GetAttachmentDownloadUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly enrollmentsRepository: EnrollmentRepository,
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
  }: GetAttachmentDownloadUseCase.Input): Promise<FileStorage.SignedDownload> {
    const reference: File.Reference = {
      ownerType: 'lesson',
      ownerId: lessonId,
      purpose: 'attachment',
      id: fileId,
    };
    const [found, enrollment, content, file] = await Promise.all([
      this.coursesRepository.findById(courseId),
      this.enrollmentsRepository.find(callerId, courseId),
      this.lessonsRepository.findContent(courseId, lessonId),
      this.filesRepository.find(reference),
    ]);
    const course = Course.requireFound(found);
    course.requireReadableBy(callerId, callerRole, enrollment);

    if (!content) {
      throw new LessonNotFound();
    }

    if (file?.status !== fileStatuses.Uploaded) {
      throw new AttachmentNotFound();
    }

    return this.fileStorage.signDownload({
      key: file.originalKey,
      fileName: file.name ?? file.id,
      contentType: file.contentType,
    });
  }
}

export namespace GetAttachmentDownloadUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    lessonId: Lesson.Id;
    fileId: File.Id;
  }
}
