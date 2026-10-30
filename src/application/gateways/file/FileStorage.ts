import type { File } from '@application/entities/file/File';

export interface FileStorage {
  signUpload: (upload: FileStorage.Upload) => Promise<FileStorage.SignedUpload>;

  // A GET to a video, inline, for as long as the signer's session allows.
  signPlayback: (
    playback: FileStorage.Playback,
  ) => Promise<FileStorage.SignedDownload>;

  startMultipart: (start: FileStorage.MultipartStart) => Promise<string>;

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

  signDownload: (
    download: FileStorage.Download,
  ) => Promise<FileStorage.SignedDownload>;

  // Null when the key is gone or holds another object than the one announced.
  readOriginal: (
    key: string,
    eTag: string,
  ) => Promise<FileStorage.Original | null>;

  statOriginal: (key: string, eTag: string) => Promise<number | null>;

  deleteOriginal: (key: string) => Promise<void>;

  putExport: (file: FileStorage.ExportFile) => Promise<void>;

  putPublic: (asset: FileStorage.PublicAsset) => Promise<void>;

  deletePublic: (keys: string[]) => Promise<void>;

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

  export interface Multipart {
    key: string;
    uploadId: string;
  }

  export interface MultipartStart {
    key: string;
    contentType: string;
  }

  export interface PartsToSign extends Multipart {
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
