import type { StudentExport } from '@application/entities/export/StudentExport';

// Asks for the CSV of an export to be written (Q384, Q423).
export interface StudentExportQueue {
  enqueue: (exportIds: StudentExport.Id[]) => Promise<void>;
}
