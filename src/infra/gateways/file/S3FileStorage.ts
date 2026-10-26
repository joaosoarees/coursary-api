import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3ServiceException,
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
