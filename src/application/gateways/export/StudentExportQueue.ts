import type { StudentExport } from '@application/entities/export/StudentExport';

export interface StudentExportQueue {
  enqueue: (exportIds: StudentExport.Id[]) => Promise<void>;
}
