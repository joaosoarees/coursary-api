import type { Account } from '@application/entities/account/Account';
import {
  exportStatuses,
  type StudentExport,
} from '@application/entities/export/StudentExport';
import { ExportNotFound } from '@application/errors/export';
import type { FileStorage } from '@application/gateways/file/FileStorage';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { StudentExportRepository } from '@application/repositories/export/StudentExportRepository';
import { StudentExportDetails } from '@application/usecases/export/StudentExportDetails';

export class GetStudentExportUseCase {
  constructor(
    private readonly exportsRepository: StudentExportRepository,
    private readonly coursesRepository: CourseRepository,
    private readonly fileStorage: FileStorage,
  ) {}

  async execute({
    callerId,
    callerRole,
    exportId,
  }: GetStudentExportUseCase.Input): Promise<StudentExportDetails> {
    const studentExport = await this.exportsRepository.find(exportId);
    const course = studentExport
      ? await this.coursesRepository.findById(studentExport.courseId)
      : null;

    if (!studentExport || !course?.isManagedBy(callerId, callerRole)) {
      throw new ExportNotFound();
    }

    const download =
      studentExport.status === exportStatuses.Ready
        ? await this.fileStorage.signDownload({
            key: studentExport.fileKey,
            fileName: studentExport.fileName,
            contentType: 'text/csv; charset=utf-8',
          })
        : undefined;

    return StudentExportDetails.fromExport(studentExport, new Date(), download);
  }
}

export namespace GetStudentExportUseCase {
  export interface Input {
    callerId: Account.Id;
    callerRole: Account.Role;
    exportId: StudentExport.Id;
  }
}
