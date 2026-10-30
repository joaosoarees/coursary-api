import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { Course } from '@application/entities/course/Course';
import type { File } from '@application/entities/file/File';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { FileOwner } from '@application/usecases/file/FileOwner';

export class CourseCoverOwner implements FileOwner {
  constructor(private readonly coursesRepository: CourseRepository) {}

  // A course being deleted reads as absent.
  async readCopy(ownerId: string): Promise<FileOwner.Current | null> {
    const course = await this.coursesRepository.findById(Course.toId(ownerId), {
      consistent: true,
    });

    return course ? { copy: course.cover } : null;
  }

  setCopyOperation(
    ownerId: string,
    copy: File.Copy,
    previousFileId: File.Id | undefined,
  ): UnitOfWork.Operation {
    return this.coursesRepository.setCoverOperation(
      Course.toId(ownerId),
      copy,
      previousFileId,
    );
  }
}
