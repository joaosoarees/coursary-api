import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { File } from '@application/entities/file/File';

// Where a processed image is copied: the account for an avatar, the course for a cover (Q400).
export interface FileOwner {
  // Strong; null when the owner is gone (or, for a course, being deleted).
  readCopy: (ownerId: string) => Promise<FileOwner.Current | null>;

  // Fails with Conflict when the copy is no longer the one read.
  setCopyOperation: (
    ownerId: string,
    copy: File.Copy,
    previousFileId: File.Id | undefined,
  ) => UnitOfWork.Operation;
}

export namespace FileOwner {
  export interface Current {
    copy: File.Copy | undefined;
  }

  // One for every purpose whose upload is an image copied into its owner.
  export type ByPurpose = Record<File.ImagePurpose, FileOwner>;
}
