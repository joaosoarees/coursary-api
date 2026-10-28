import { Course } from '@application/entities/course/Course';
import type { File } from '@application/entities/file/File';
import type { Lesson } from '@application/entities/outline/Lesson';
import { VideoUploadNotFound } from '@application/errors/file';
import { LessonNotFound } from '@application/errors/outline';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { FileRepository } from '@application/repositories/file/FileRepository';
import type { LessonRepository } from '@application/repositories/outline/LessonRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

// A video upload of a lesson its caller may edit, read strongly; 404 for any other (Q434, Q435).
export class VideoUploadLookup {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly lessonsRepository: LessonRepository,
    private readonly filesRepository: FileRepository,
  ) {}

  async find({
    callerId,
    callerRole,
    courseId,
    lessonId,
    fileId,
  }: VideoUploadLookup.Input): Promise<VideoUploadLookup.Upload> {
    const reference: File.Reference = {
      ownerType: 'lesson',
      ownerId: lessonId,
      purpose: 'video',
      id: fileId,
    };
    const [found, content, file] = await Promise.all([
      this.coursesRepository.findById(courseId),
      this.lessonsRepository.findContent(courseId, lessonId),
      this.filesRepository.find(reference),
    ]);
    const course = Course.requireFound(found);
    course.requireEditableBy(callerId, callerRole);

    if (!content) {
      throw new LessonNotFound();
    }

    if (!file?.uploadId) {
      throw new VideoUploadNotFound();
    }

    return { file, uploadId: file.uploadId };
  }
}

export namespace VideoUploadLookup {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    lessonId: Lesson.Id;
    fileId: File.Id;
  }

  export interface Upload {
    file: File;
    uploadId: string;
  }
}
