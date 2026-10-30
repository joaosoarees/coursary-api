import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { StudentExport } from '@application/entities/export/StudentExport';

export interface StudentExportRepository {
  // In the transaction that marks the course's pending export.
  createOperation: (studentExport: StudentExport) => UnitOfWork.Operation;

  // Strong: the job and the caller decide on the status they read.
  find: (id: StudentExport.Id) => Promise<StudentExport | null>;

  // Only from PENDING; does nothing when the export already left it.
  markReady: (studentExport: StudentExport) => Promise<void>;

  // Only from PENDING; does nothing when the export already left it.
  markFailed: (studentExport: StudentExport) => Promise<void>;
}
