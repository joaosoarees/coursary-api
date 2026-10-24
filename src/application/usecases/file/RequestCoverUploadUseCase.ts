import { Course } from '@application/entities/course/Course';
import { File } from '@application/entities/file/File';
import type { FileStorage } from '@application/gateways/file/FileStorage';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { FileRepository } from '@application/repositories/file/FileRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

// Whoever may edit the course sends its cover; the record comes before the signature (Q378, Q399).
export class RequestCoverUploadUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly filesRepository: FileRepository,
    private readonly fileStorage: FileStorage,
  ) {}

  async execute({
    callerId,
    callerRole,
    courseId,
    contentType,
  }: RequestCoverUploadUseCase.Input): Promise<RequestCoverUploadUseCase.Output> {
    const found = await this.coursesRepository.findById(courseId);
    const course = Course.requireFound(found);
    course.requireEditableBy(callerId, callerRole);

    const file = File.create({
      ownerId: course.id,
      purpose: 'cover',
      contentType,
    });
    await this.filesRepository.create(file);

    const { url, fields } = await this.fileStorage.signUpload({
      key: file.originalKey,
      contentType,
      maxBytes: File.ruleOf(file.purpose).maxBytes,
    });

    return { fileId: file.id, url, fields };
  }
}

export namespace RequestCoverUploadUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    contentType: string;
  }

  export interface Output {
    fileId: File.Id;
    url: string;
    fields: Record<string, string>;
  }
}
