import type { File } from '@application/entities/file/File';

// The two buckets: originals in the private one, variants in the one the CDN reads (Q70).
export interface FileStorage {
  // A presigned POST to the original's key, bound to its type and size (Q379, Q388).
  signUpload: (upload: FileStorage.Upload) => Promise<FileStorage.SignedUpload>;

  // Opens a multipart upload to the original's key and answers its upload id (Q446).
  startMultipart: (start: FileStorage.MultipartStart) => Promise<string>;

  // A PUT URL per part, each bound to its length (Q441).
  signParts: (
    parts: FileStorage.PartsToSign,
  ) => Promise<FileStorage.SignedParts>;

  completeMultipart: (
    completion: FileStorage.MultipartCompletion,
  ) => Promise<FileStorage.CompletionOutcome>;

  // gone: completed or aborted already; a completed one still has its object coming.
  abortMultipart: (
    upload: FileStorage.Multipart,
  ) => Promise<FileStorage.AbortOutcome>;

  // A GET to an original, saved under the name it was sent with.
  signDownload: (
    download: FileStorage.Download,
  ) => Promise<FileStorage.SignedDownload>;

  // Null when the key is gone or holds another object than the one announced.
  readOriginal: (
    key: string,
    eTag: string,
  ) => Promise<FileStorage.Original | null>;

  // Only the size, for files kept as sent; null as for readOriginal.
  statOriginal: (key: string, eTag: string) => Promise<number | null>;

  deleteOriginal: (key: string) => Promise<void>;

  // An export's CSV, beside the originals in the private bucket (Q384).
  putExport: (file: FileStorage.ExportFile) => Promise<void>;

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

  // A video watched in the page, not saved: no download name (Q438).
  export interface Playback {
    key: string;
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

  export interface ExportFile {
    key: string;
    content: string;
  }

  // A video sent in parts straight to S3 (Q434).
  export interface Multipart {
    key: string;
    uploadId: string;
  }

  export interface MultipartStart {
    key: string;
    contentType: string;
  }

  export interface PartsToSign extends Multipart {
    // Each part's exact length, which its URL signs.
    parts: { partNumber: number; length: number }[];
  }

  export interface SignedParts {
    urls: { partNumber: number; url: string }[];
    expiresAt: string;
  }

  export interface MultipartCompletion extends Multipart {
    // The size recorded at the start; S3 refuses parts that add up to another.
    size: number;
    // In ascending order, each part from 1 to the last once.
    parts: { partNumber: number; eTag: string }[];
  }

  // invalid-parts: an ETag S3 does not have, or parts that do not add up to the size;
  // no-upload: completed or aborted already.
  export type CompletionOutcome = 'completed' | 'invalid-parts' | 'no-upload';

  export type AbortOutcome = 'aborted' | 'gone';

  export interface PublicAsset {
    key: string;
    bytes: Uint8Array;
    contentType: string;
  }
}
