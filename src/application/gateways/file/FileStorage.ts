// The two buckets: originals in the private one, variants in the one the CDN reads (Q70).
export interface FileStorage {
  // A presigned POST to the original's key, bound to its type and size (Q379, Q388).
  signUpload: (upload: FileStorage.Upload) => Promise<FileStorage.SignedUpload>;

  // Null when the key is gone or holds another object than the one announced.
  readOriginal: (
    key: string,
    eTag: string,
  ) => Promise<FileStorage.Original | null>;

  deleteOriginal: (key: string) => Promise<void>;

  putPublic: (asset: FileStorage.PublicAsset) => Promise<void>;

  deletePublic: (keys: string[]) => Promise<void>;
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
