import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { File } from '@application/entities/file/File';

export interface FileRepository {
  // Written and awaited before any upload is signed.
  create: (file: File) => Promise<void>;

  // Strong: the upload consumer decides on the status it reads.
  find: (reference: File.Reference) => Promise<File | null>;

  // Strong; leaves out pending files whose time ran out.
  listByOwner: (
    owner: Pick<File.Reference, 'ownerType' | 'ownerId'>,
    purpose: File.Purpose,
  ) => Promise<File[]>;

  // Only from PENDING; does nothing when the file already left it.
  markUploaded: (file: File) => Promise<void>;

  // False when there was nothing to delete.
  delete: (reference: File.Reference) => Promise<boolean>;

  // Every File of the owner, pending ones included, once the owner is gone.
  deleteByOwner: (owner: File.Owner) => Promise<void>;

  // Only on a file that was sent; a conflict means it was deleted meanwhile.
  setPositionOperation: (
    reference: File.Reference,
    position: number,
  ) => UnitOfWork.Operation;

  // Only from PENDING; a conflict means another attempt got there first.
  markProcessedOperation: (file: File) => UnitOfWork.Operation;

  deleteOperation: (reference: File.Reference) => UnitOfWork.Operation;

  // Only from PENDING; does nothing when the file already left it.
  markFailed: (file: File) => Promise<void>;
}
