import { File } from '@application/entities/file/File';
import type { FileStorage } from '@application/gateways/file/FileStorage';

// Both buckets in memory, keyed by object key.
export class FakeFileStorage implements FileStorage {
  readonly signed: FileStorage.Upload[] = [];
  readonly originals = new Map<string, { bytes: Uint8Array; eTag: string }>();
  readonly publicAssets = new Map<string, FileStorage.PublicAsset>();
  readonly exports = new Map<string, string>();
  // Open multipart uploads by upload id.
  readonly multipartUploads = new Map<string, FileStorage.MultipartStart>();
  readonly signedParts: FileStorage.PartsToSign[] = [];
  // Set to make the next completions fail as S3 would on a wrong ETag.
  refuseParts = false;
  private uploadCount = 0;

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

  startMultipart(start: FileStorage.MultipartStart): Promise<string> {
    this.uploadCount += 1;
    const uploadId = `upload-${String(this.uploadCount)}`;
    this.multipartUploads.set(uploadId, start);

    return Promise.resolve(uploadId);
  }

  signParts(parts: FileStorage.PartsToSign): Promise<FileStorage.SignedParts> {
    this.signedParts.push(parts);
    const urls = parts.parts.map(({ partNumber }) => ({
      partNumber,
      url: `https://private-bucket.s3.amazonaws.com/${parts.key}?partNumber=${String(partNumber)}&uploadId=${parts.uploadId}`,
    }));

    return Promise.resolve({ urls, expiresAt: '2026-01-01T01:00:00.000Z' });
  }

  // The object S3 would join: the recorded size, under an ETag naming its part count.
  completeMultipart({
    key,
    uploadId,
    size,
    parts,
  }: FileStorage.MultipartCompletion): Promise<FileStorage.CompletionOutcome> {
    if (this.multipartUploads.get(uploadId)?.key !== key) {
      return Promise.resolve('no-upload');
    }

    if (this.refuseParts) {
      return Promise.resolve('invalid-parts');
    }

    this.multipartUploads.delete(uploadId);
    this.originals.set(key, {
      bytes: new Uint8Array(size),
      eTag: `${uploadId}-${String(parts.length)}`,
    });

    return Promise.resolve('completed');
  }

  abortMultipart({ uploadId }: FileStorage.Multipart): Promise<void> {
    this.multipartUploads.delete(uploadId);

    return Promise.resolve();
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
