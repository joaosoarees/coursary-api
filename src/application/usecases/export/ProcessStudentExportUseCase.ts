import {
  exportStatuses,
  type StudentExport,
} from '@application/entities/export/StudentExport';
import type { FileStorage } from '@application/gateways/file/FileStorage';
import type { ListCourseStudentsQuery } from '@application/queries/enrollment/ListCourseStudentsQuery';
import type { StudentSummary } from '@application/queries/enrollment/StudentSummary';
import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import type { StudentExportRepository } from '@application/repositories/export/StudentExportRepository';
import { StudentsCsv } from '@application/usecases/export/StudentsCsv';

// One run per export: every active student, one file, then READY (Q424). A repeated message
// finds the export finished, or writes the same key again.
export class ProcessStudentExportUseCase {
  static readonly pageSize = 1000;

  constructor(
    private readonly exportsRepository: StudentExportRepository,
    private readonly coursesRepository: CourseRepository,
    private readonly listCourseStudents: ListCourseStudentsQuery,
    private readonly fileStorage: FileStorage,
  ) {}

  async execute({
    exportId,
  }: ProcessStudentExportUseCase.Input): Promise<ProcessStudentExportUseCase.Outcome> {
    const studentExport = await this.exportsRepository.find(exportId);

    if (!studentExport) {
      return 'skipped';
    }

    // A run that finished but failed to free the course frees it now.
    if (studentExport.status !== exportStatuses.Pending) {
      await this.coursesRepository.clearPendingExport(studentExport);

      return 'skipped';
    }

    const course = await this.coursesRepository.findById(
      studentExport.courseId,
      { consistent: true },
    );

    if (!course) {
      studentExport.fail();
      await this.exportsRepository.markFailed(studentExport);

      return 'failed';
    }

    const students = await this.studentsOf(studentExport);
    const csv = StudentsCsv.fromStudents(students, course.lessonCount);
    await this.fileStorage.putExport({
      key: studentExport.fileKey,
      content: csv.content,
    });
    studentExport.ready(csv.rowCount);
    await this.exportsRepository.markReady(studentExport);
    await this.coursesRepository.clearPendingExport(studentExport);

    return 'ready';
  }

  private async studentsOf(
    studentExport: StudentExport,
  ): Promise<StudentSummary[]> {
    const students: StudentSummary[] = [];
    let cursor: string | undefined;

    do {
      const page = await this.listCourseStudents.execute({
        courseId: studentExport.courseId,
        page: { limit: ProcessStudentExportUseCase.pageSize, cursor },
      });
      students.push(...page.items);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    return students;
  }
}

export namespace ProcessStudentExportUseCase {
  export interface Input {
    exportId: StudentExport.Id;
  }

  export type Outcome = 'ready' | 'failed' | 'skipped';
}
