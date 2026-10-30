import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { Course } from '@application/entities/course/Course';
import { StudentExport } from '@application/entities/export/StudentExport';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { StudentExportRepository } from '@application/repositories/export/StudentExportRepository';
import type { CourseEditor } from '@application/usecases/course/CourseEditor';
import { StudentExportDetails } from '@application/usecases/export/StudentExportDetails';

export class RequestStudentExportUseCase {
  constructor(
    private readonly coursesRepository: CourseRepository,
    private readonly exportsRepository: StudentExportRepository,
    private readonly unitOfWork: UnitOfWork.Factory,
  ) {}

  async execute({
    callerId,
    callerRole,
    courseId,
  }: RequestStudentExportUseCase.Input): Promise<StudentExportDetails> {
    const found = await this.coursesRepository.findById(courseId);
    const course = Course.requireFound(found);
    course.requireManagedBy(callerId, callerRole);

    const studentExport = StudentExport.create({
      courseId: course.id,
      requestedBy: callerId,
    });
    const unit = this.unitOfWork();
    unit.add(
      this.exportsRepository.createOperation(studentExport),
      this.coursesRepository.startExportOperation(studentExport),
    );
    await unit.commit();

    return StudentExportDetails.fromExport(
      studentExport,
      studentExport.createdAt,
    );
  }
}

export namespace RequestStudentExportUseCase {
  export interface Input extends CourseEditor {
    courseId: Course.Id;
  }
}
