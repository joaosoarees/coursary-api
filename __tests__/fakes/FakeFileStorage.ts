import type { FileStorage } from '@application/gateways/file/FileStorage';

// Both buckets in memory, keyed by object key.
export class FakeFileStorage implements FileStorage {
  readonly signed: FileStorage.Upload[] = [];
  readonly originals = new Map<string, { bytes: Uint8Array; eTag: string }>();
  readonly publicAssets = new Map<string, FileStorage.PublicAsset>();

  signUpload(upload: FileStorage.Upload): Promise<FileStorage.SignedUpload> {
    this.signed.push(upload);

    return Promise.resolve({
      url: 'https://private-bucket.s3.amazonaws.com/',
      fields: { key: upload.key, 'Content-Type': upload.contentType },
    });
  }

  readOriginal(
    key: string,
    eTag: string,
  ): Promise<FileStorage.Original | null> {
    const original = this.originals.get(key);

    if (original?.eTag !== eTag) {
      return Promise.resolve(null);
    }

    return Promise.resolve({
      bytes: original.bytes,
      size: original.bytes.length,
    });
  }

  deleteOriginal(key: string): Promise<void> {
    this.originals.delete(key);

    return Promise.resolve();
  }

  putPublic(asset: FileStorage.PublicAsset): Promise<void> {
    this.publicAssets.set(asset.key, asset);

    return Promise.resolve();
  }

  deletePublic(keys: string[]): Promise<void> {
    keys.forEach((key) => this.publicAssets.delete(key));

    return Promise.resolve();
  }
}
