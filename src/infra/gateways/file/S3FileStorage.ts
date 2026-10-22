import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

import type { FileStorage } from '@application/gateways/file/FileStorage';
import { s3Client } from '@infra/clients/s3Client';
import type { AppConfig } from '@shared/config/AppConfig';

export class S3FileStorage implements FileStorage {
  // Long enough to pick a file and send it; a slow upload that starts in time still lands.
  static readonly uploadSeconds = 300;

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

  async deletePublic(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    const command = new DeleteObjectsCommand({
      Bucket: this.config.publicAssetsBucket,
      Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
    });

    const { Errors } = await s3Client.send(command);

    if (Errors?.length) {
      throw new Error(
        `S3 kept ${String(Errors.length)} of ${String(keys.length)} public objects: ${String(Errors[0]?.Code)}.`,
      );
    }
  }
}
