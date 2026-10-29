import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListPartsCommand,
  NoSuchKey,
  NoSuchUpload,
  PutObjectCommand,
  S3ServiceException,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { File } from '@application/entities/file/File';
import type { FileStorage } from '@application/gateways/file/FileStorage';
import { s3Client } from '@infra/clients/s3Client';
import type { AppConfig } from '@shared/config/AppConfig';

export class S3FileStorage implements FileStorage {
  // Long enough to pick a file and send it; a slow upload that starts in time still lands.
  static readonly uploadSeconds = 300;

  // Enough to start the download; a URL handed around stops working soon.
  static readonly downloadSeconds = 300;

  // A batch of up to 100 part URLs: enough for a slow connection to start the last one (Q441).
  static readonly partSeconds = 3600;

  // A part still arriving during an abort may survive it: abort again until none is listed.
  static readonly maxAborts = 3;

  // The keys carry their content's hash, so a variant never changes (Q69).
  static readonly publicCacheControl = 'public, max-age=31536000, immutable';

  constructor(private readonly config: AppConfig) {}

  async signUpload({
    key,
    contentType,
    maxBytes,
  }: FileStorage.Upload): Promise<FileStorage.SignedUpload> {
    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: this.config.privateFilesBucket,
      Key: key,
      Conditions: [['content-length-range', 1, maxBytes]],
      Fields: { 'Content-Type': contentType },
      Expires: S3FileStorage.uploadSeconds,
    });

    return { url, fields };
  }

  // A GET for one file, saved under the name it was sent with (Q57, Q406).
  async signDownload({
    key,
    fileName,
    contentType,
  }: FileStorage.Download): Promise<FileStorage.SignedDownload> {
    const command = new GetObjectCommand({
      Bucket: this.config.privateFilesBucket,
      Key: key,
      ResponseContentType: contentType,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: S3FileStorage.downloadSeconds,
    });

    return { url, expiresIn: S3FileStorage.downloadSeconds };
  }

  // The type is set here once: the parts carry none, and the object takes this one (Q434).
  async startMultipart({
    key,
    contentType,
  }: FileStorage.MultipartStart): Promise<string> {
    const command = new CreateMultipartUploadCommand({
      Bucket: this.config.privateFilesBucket,
      Key: key,
      ContentType: contentType,
    });

    const { UploadId } = await s3Client.send(command);

    if (!UploadId) {
      throw new Error(`S3 opened no multipart upload for ${key}.`);
    }

    return UploadId;
  }

  // Signing calls no AWS; each URL takes exactly its part's length.
  async signParts({
    key,
    uploadId,
    parts,
  }: FileStorage.PartsToSign): Promise<FileStorage.SignedParts> {
    const signedAt = new Date();
    const urls = await Promise.all(
      parts.map(async ({ partNumber, length }) => {
        const command = new UploadPartCommand({
          Bucket: this.config.privateFilesBucket,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
          ContentLength: length,
        });
        const url = await getSignedUrl(s3Client, command, {
          expiresIn: S3FileStorage.partSeconds,
          signingDate: signedAt,
        });

        return { partNumber, url };
      }),
    );
    const expiresAt = new Date(
      signedAt.getTime() + S3FileStorage.partSeconds * 1000,
    );

    return { urls, expiresAt: expiresAt.toISOString() };
  }

  async completeMultipart({
    key,
    uploadId,
    size,
    parts,
  }: FileStorage.MultipartCompletion): Promise<FileStorage.CompletionOutcome> {
    const command = new CompleteMultipartUploadCommand({
      Bucket: this.config.privateFilesBucket,
      Key: key,
      UploadId: uploadId,
      MpuObjectSize: size,
      MultipartUpload: {
        Parts: parts.map(({ partNumber, eTag }) => ({
          PartNumber: partNumber,
          ETag: eTag,
        })),
      },
    });

    try {
      await s3Client.send(command);

      return 'completed';
    } catch (error) {
      if (error instanceof NoSuchUpload) {
        return 'no-upload';
      }

      // InvalidPart, InvalidPartOrder, EntityTooSmall, or a size the parts do not add up to.
      if (
        error instanceof S3ServiceException &&
        error.$metadata.httpStatusCode === 400
      ) {
        return 'invalid-parts';
      }

      throw error;
    }
  }

  async abortMultipart(
    upload: FileStorage.Multipart,
  ): Promise<FileStorage.AbortOutcome> {
    const target = {
      Bucket: this.config.privateFilesBucket,
      Key: upload.key,
      UploadId: upload.uploadId,
    };
    const abort = new AbortMultipartUploadCommand(target);
    const listParts = new ListPartsCommand(target);

    for (let attempt = 1; attempt <= S3FileStorage.maxAborts; attempt++) {
      try {
        await s3Client.send(abort);
      } catch (error) {
        // Only the first abort can find it gone: later ones follow parts that survived ours.
        if (error instanceof NoSuchUpload) {
          return attempt === 1 ? 'gone' : 'aborted';
        }

        throw error;
      }

      try {
        const { Parts = [] } = await s3Client.send(listParts);

        if (Parts.length === 0) {
          return 'aborted';
        }
      } catch (error) {
        if (error instanceof NoSuchUpload) {
          return 'aborted';
        }

        throw error;
      }
    }

    console.warn(
      JSON.stringify({ event: 'PartsLeftAfterAbort', key: upload.key }),
    );

    return 'aborted';
  }

  async readOriginal(
    key: string,
    eTag: string,
  ): Promise<FileStorage.Original | null> {
    const command = new GetObjectCommand({
      Bucket: this.config.privateFilesBucket,
      Key: key,
      // The event's ETag has no quotes; another object at the key answers 412.
      IfMatch: `"${eTag}"`,
    });

    try {
      const { Body, ContentLength } = await s3Client.send(command);
      const bytes = (await Body?.transformToByteArray()) ?? new Uint8Array();

      return { bytes, size: ContentLength ?? bytes.length };
    } catch (error) {
      if (
        error instanceof NoSuchKey ||
        (error instanceof S3ServiceException &&
          error.$metadata.httpStatusCode === 412)
      ) {
        return null;
      }

      throw error;
    }
  }

  // Only the size, for files kept as sent: a video may be larger than the function's memory.
  async statOriginal(key: string, eTag: string): Promise<number | null> {
    const command = new HeadObjectCommand({
      Bucket: this.config.privateFilesBucket,
      Key: key,
      IfMatch: `"${eTag}"`,
    });

    try {
      const { ContentLength } = await s3Client.send(command);

      return ContentLength ?? 0;
    } catch (error) {
      // A HEAD has no body, so a missing key comes back as a bare 404.
      if (
        error instanceof S3ServiceException &&
        [404, 412].includes(error.$metadata.httpStatusCode ?? 0)
      ) {
        return null;
      }

      throw error;
    }
  }

  async deleteOriginal(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.config.privateFilesBucket,
      Key: key,
    });

    await s3Client.send(command);
  }

  async putPublic({
    key,
    bytes,
    contentType,
  }: FileStorage.PublicAsset): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.config.publicAssetsBucket,
      Key: key,
      Body: bytes,
      ContentType: contentType,
      CacheControl: S3FileStorage.publicCacheControl,
    });

    await s3Client.send(command);
  }

  // A CSV in the private bucket, read only through a presigned GET (Q384).
  async putExport({ key, content }: FileStorage.ExportFile): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.config.privateFilesBucket,
      Key: key,
      Body: content,
      ContentType: 'text/csv; charset=utf-8',
    });

    await s3Client.send(command);
  }

  async deletePublic(keys: string[]): Promise<void> {
    await this.deleteKeys(this.config.publicAssetsBucket, keys);
  }

  // Originals and variants alike; an owner with nothing stored is fine (Q418).
  async deleteOwnerFiles(owner: File.Owner): Promise<void> {
    const prefix = File.ownerPrefixOf(owner);

    await Promise.all(
      [this.config.privateFilesBucket, this.config.publicAssetsBucket].map(
        (bucket) => this.deletePrefix(bucket, prefix),
      ),
    );
  }

  // A page of a listing holds at most the 1000 keys one DeleteObjects takes.
  private async deletePrefix(bucket: string, prefix: string): Promise<void> {
    let token: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: token,
      });
      const { Contents = [], NextContinuationToken } =
        await s3Client.send(command);

      await this.deleteKeys(
        bucket,
        Contents.flatMap(({ Key }) => (Key ? [Key] : [])),
      );
      token = NextContinuationToken;
    } while (token);
  }

  private async deleteKeys(bucket: string, keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    const command = new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
    });

    const { Errors } = await s3Client.send(command);

    if (Errors?.length) {
      throw new Error(
        `S3 kept ${String(Errors.length)} of ${String(keys.length)} objects in ${bucket}: ${String(Errors[0]?.Code)}.`,
      );
    }
  }
}
