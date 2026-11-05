import { Course } from '@application/entities/course/Course';
import type { File } from '@application/entities/file/File';
import { FileNotFound } from '@application/errors/file';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { FileRepository } from '@application/repositories/file/FileRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';

export class GetCoverUploadUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly filesRepository: FileRepository,
  ) {}

  async execute({
    callerId,
    callerRole,
    courseId,
    fileId,
  }: GetCoverUploadUseCase.Input): Promise<GetCoverUploadUseCase.Output> {
    const [found, file] = await Promise.all([
      this.coursesRepository.findById(courseId),
      this.filesRepository.find({
        ownerType: 'course',
        ownerId: courseId,
        purpose: 'cover',
        id: fileId,
      }),
    ]);
    const course = Course.requireFound(found);
    course.requireManagedBy(callerId, callerRole);

    if (!file) {
      throw new FileNotFound();
    }

    return { status: file.status };
  }
}

export namespace GetCoverUploadUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    fileId: File.Id;
  }

  export interface Output {
    status: File.Status;
  }
}
