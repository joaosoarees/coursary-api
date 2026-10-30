import { Course } from '@application/entities/course/Course';
import { File, fileStatuses } from '@application/entities/file/File';
import type { Lesson } from '@application/entities/outline/Lesson';
import { LessonNotFound } from '@application/errors/outline';
import type { FileStorage } from '@application/gateways/file/FileStorage';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { FileRepository } from '@application/repositories/file/FileRepository';
import type { LessonRepository } from '@application/repositories/outline/LessonRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

export class RequestVideoUploadUseCase {
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
    size,
  }: RequestVideoUploadUseCase.Input): Promise<RequestVideoUploadUseCase.Output> {
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

    // One upload open per lesson: the one still pending gives way.
    const pending = videos.filter(
      (video) => video.status === fileStatuses.Pending,
    );
    await Promise.all(pending.map((video) => this.discard(video)));

    const file = File.create({
      ownerId: lessonId,
      purpose: 'video',
      contentType,
      size,
    });
    const start = { key: file.originalKey, contentType };
    // Opened before the record, so the record always names its upload.
    file.uploadId = await this.fileStorage.startMultipart(start);
    await this.filesRepository.create(file);

    return {
      fileId: file.id,
      partSize: file.partBytes,
      partCount: file.partCount,
    };
  }

  // An upload already completed keeps its record: processUpload confirms it, and the new
  // video replaces it in turn.
  private async discard(video: File): Promise<void> {
    if (video.uploadId) {
      const upload = { key: video.originalKey, uploadId: video.uploadId };

      if ((await this.fileStorage.abortMultipart(upload)) === 'gone') {
        return;
      }
    }

    await this.filesRepository.delete(video);
  }
}

export namespace RequestVideoUploadUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    lessonId: Lesson.Id;
    contentType: string;
    size: number;
  }

  export interface Output {
    fileId: File.Id;
    partSize: number;
    partCount: number;
  }
}
