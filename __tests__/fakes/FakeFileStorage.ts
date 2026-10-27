import { File } from '@application/entities/file/File';
import type { FileStorage } from '@application/gateways/file/FileStorage';

// Both buckets in memory, keyed by object key.
export class FakeFileStorage implements FileStorage {
  readonly signed: FileStorage.Upload[] = [];
  readonly originals = new Map<string, { bytes: Uint8Array; eTag: string }>();
  readonly publicAssets = new Map<string, FileStorage.PublicAsset>();
  readonly exports = new Map<string, string>();

  signUpload(upload: FileStorage.Upload): Promise<FileStorage.SignedUpload> {
    this.signed.push(upload);

    return Promise.resolve({
      url: 'https://private-bucket.s3.amazonaws.com/',
      fields: { key: upload.key, 'Content-Type': upload.contentType },
    });
  }

  signDownload(
    download: FileStorage.Download,
  ): Promise<FileStorage.SignedDownload> {
    return Promise.resolve({
      url: `https://private-bucket.s3.amazonaws.com/${download.key}?name=${encodeURIComponent(download.fileName)}`,
      expiresIn: 300,
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

  putExport({ key, content }: FileStorage.ExportFile): Promise<void> {
    this.exports.set(key, content);

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

  deleteOwnerFiles(owner: File.Owner): Promise<void> {
    const prefix = File.ownerPrefixOf(owner);

    for (const bucket of [this.originals, this.publicAssets]) {
      [...bucket.keys()]
        .filter((key) => key.startsWith(prefix))
        .forEach((key) => bucket.delete(key));
    }

    return Promise.resolve();
  }
}
