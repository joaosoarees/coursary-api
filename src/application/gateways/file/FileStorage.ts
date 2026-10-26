import type { File } from '@application/entities/file/File';

// The two buckets: originals in the private one, variants in the one the CDN reads (Q70).
export interface FileStorage {
  // A presigned POST to the original's key, bound to its type and size (Q379, Q388).
  signUpload: (upload: FileStorage.Upload) => Promise<FileStorage.SignedUpload>;

  // A GET to an original, saved under the name it was sent with.
  signDownload: (
    download: FileStorage.Download,
  ) => Promise<FileStorage.SignedDownload>;

  // Null when the key is gone or holds another object than the one announced.
  readOriginal: (
    key: string,
    eTag: string,
  ) => Promise<FileStorage.Original | null>;

  deleteOriginal: (key: string) => Promise<void>;

  putPublic: (asset: FileStorage.PublicAsset) => Promise<void>;

  deletePublic: (keys: string[]) => Promise<void>;

  // Everything under the owner's prefix in both buckets, once its records are going (Q418).
  deleteOwnerFiles: (owner: File.Owner) => Promise<void>;
}

export namespace FileStorage {
  export interface Upload {
    key: string;
    contentType: string;
    maxBytes: number;
  }

  export interface SignedUpload {
    url: string;
    fields: Record<string, string>;
  }

  export interface Download {
    key: string;
    fileName: string;
    contentType: string;
  }

  export interface SignedDownload {
    url: string;
    expiresIn: number;
  }

  export interface Original {
    bytes: Uint8Array;
    size: number;
  }

  export interface PublicAsset {
    key: string;
    bytes: Uint8Array;
    contentType: string;
  }
}
