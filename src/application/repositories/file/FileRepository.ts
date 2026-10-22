import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { File } from '@application/entities/file/File';

export interface FileRepository {
  // Written and awaited before any upload is signed (Q378).
  create: (file: File) => Promise<void>;

  // Strong: the upload consumer decides on the status it reads.
  find: (reference: File.Reference) => Promise<File | null>;

  // Only from PENDING; a conflict means another attempt got there first.
  markProcessedOperation: (file: File) => UnitOfWork.Operation;

  deleteOperation: (reference: File.Reference) => UnitOfWork.Operation;

  // Only from PENDING; does nothing when the file already left it.
  markFailed: (file: File) => Promise<void>;
}
