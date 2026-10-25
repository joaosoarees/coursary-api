import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { Course } from '@application/entities/course/Course';
import { type File, fileStatuses } from '@application/entities/file/File';
import type { Lesson } from '@application/entities/outline/Lesson';
import { AttachmentOrderMismatch } from '@application/errors/file';
import { LessonNotFound } from '@application/errors/outline';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { FileRepository } from '@application/repositories/file/FileRepository';
import type { LessonRepository } from '@application/repositories/outline/LessonRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';
import { AttachmentSummary } from '@application/usecases/file/AttachmentSummary';

// Every sent material, once, in the new order; one transaction rewrites the positions (Q408).
export class ReorderAttachmentsUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly lessonsRepository: LessonRepository,
    private readonly filesRepository: FileRepository,
    private readonly unitOfWorkFactory: UnitOfWork.Factory,
  ) {}

  async execute({
    callerId,
    callerRole,
    courseId,
    lessonId,
    fileIds,
  }: ReorderAttachmentsUseCase.Input): Promise<AttachmentSummary[]> {
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

    const sent = new Map(
      existing
        .filter((file) => file.status === fileStatuses.Uploaded)
        .map((file) => [file.id as string, file]),
    );
    const ordered = fileIds.map((id) => sent.get(id));

    if (
      new Set(fileIds).size !== fileIds.length ||
      fileIds.length !== sent.size ||
      ordered.some((file) => file === undefined)
    ) {
      throw new AttachmentOrderMismatch();
    }

    const files = ordered as File[];
    const unitOfWork = this.unitOfWorkFactory();
    files.forEach((file, position) => {
      file.position = position;
      unitOfWork.add(this.filesRepository.setPositionOperation(file, position));
    });
    await unitOfWork.commit();

    return AttachmentSummary.listOf(files);
  }
}

export namespace ReorderAttachmentsUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
    lessonId: Lesson.Id;
    fileIds: string[];
  }
}
