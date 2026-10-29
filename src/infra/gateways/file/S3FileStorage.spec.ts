import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListPartsCommand,
  NoSuchKey,
  NoSuchUpload,
  PutObjectCommand,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { s3Client } from '@infra/clients/s3Client';
import { S3FileStorage } from '@infra/gateways/file/S3FileStorage';
import { AppConfig } from '@shared/config/AppConfig';

const storage = new S3FileStorage(new AppConfig());

beforeEach(() => {
  vi.stubEnv('PRIVATE_FILES_BUCKET', 'private-bucket');
  vi.stubEnv('PUBLIC_ASSETS_BUCKET', 'public-bucket');
  vi.stubEnv('AWS_REGION', 'sa-east-1');
  vi.stubEnv('AWS_ACCESS_KEY_ID', 'AKIDEXAMPLE');
  vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'secret');
});

const policyOf = (fields: Record<string, string>) =>
  JSON.parse(Buffer.from(fields.Policy ?? '', 'base64').toString()) as {
    expiration: string;
    conditions: unknown[];
  };

describe('S3FileStorage', () => {
  it('should sign a POST bound to the key, the type and the size range', async () => {
    const { url, fields } = await storage.signUpload({
      key: 'account/a/avatar/f/original',
      contentType: 'image/png',
      maxBytes: 5,
    });

    expect(url).toContain('private-bucket');
    expect(fields).toMatchObject({
      key: 'account/a/avatar/f/original',
      'Content-Type': 'image/png',
    });
    expect(policyOf(fields).conditions).toEqual(
      expect.arrayContaining([
        ['content-length-range', 1, 5],
        { 'Content-Type': 'image/png' },
        { key: 'account/a/avatar/f/original' },
      ]),
    );
  });

  it('should sign a short GET that saves the file under its sent name', async () => {
    const { url, expiresIn } = await storage.signDownload({
      key: 'lesson/l/attachment/f/original',
      fileName: 'Aula 1 – slides.pdf',
      contentType: 'application/pdf',
    });
    const query = new URL(url).searchParams;

    expect(url).toContain('private-bucket');
    expect(expiresIn).toBe(300);
    expect(query.get('X-Amz-Expires')).toBe('300');
    expect(query.get('response-content-type')).toBe('application/pdf');
    expect(query.get('response-content-disposition')).toBe(
      "attachment; filename*=UTF-8''Aula%201%20%E2%80%93%20slides.pdf",
    );
  });

  it('should read the original only while it is the object announced', async () => {
    const send = vi.spyOn(s3Client, 'send').mockResolvedValue({
      Body: { transformToByteArray: () => Promise.resolve(new Uint8Array(3)) },
      ContentLength: 3,
    } as never);

    await expect(storage.readOriginal('k', 'abc')).resolves.toEqual({
      bytes: new Uint8Array(3),
      size: 3,
    });

    const command = send.mock.calls[0]?.[0] as GetObjectCommand;
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect(command.input).toEqual({
      Bucket: 'private-bucket',
      Key: 'k',
      IfMatch: '"abc"',
    });
  });

  it('should answer null for a missing or replaced original', async () => {
    const replaced = new S3ServiceException({
      name: 'PreconditionFailed',
      $fault: 'client',
      $metadata: { httpStatusCode: 412 },
    });
    vi.spyOn(s3Client, 'send')
      .mockRejectedValueOnce(new NoSuchKey({ message: 'gone', $metadata: {} }))
      .mockRejectedValueOnce(replaced);

    await expect(storage.readOriginal('k', 'abc')).resolves.toBeNull();
    await expect(storage.readOriginal('k', 'abc')).resolves.toBeNull();
  });

  it('should read only the size of an original, while it is the object announced', async () => {
    const send = vi
      .spyOn(s3Client, 'send')
      .mockResolvedValue({ ContentLength: 20 } as never);

    await expect(storage.statOriginal('k', 'abc-2')).resolves.toBe(20);

    const command = send.mock.calls[0]?.[0] as HeadObjectCommand;
    expect(command).toBeInstanceOf(HeadObjectCommand);
    expect(command.input).toEqual({
      Bucket: 'private-bucket',
      Key: 'k',
      IfMatch: '"abc-2"',
    });
  });

  it('should answer null for the size of a missing or replaced original', async () => {
    const answer = (httpStatusCode: number) =>
      new S3ServiceException({
        name: 'NotFound',
        $fault: 'client',
        $metadata: { httpStatusCode },
      });
    vi.spyOn(s3Client, 'send')
      .mockRejectedValueOnce(answer(404))
      .mockRejectedValueOnce(answer(412))
      .mockRejectedValueOnce(answer(403));

    await expect(storage.statOriginal('k', 'abc')).resolves.toBeNull();
    await expect(storage.statOriginal('k', 'abc')).resolves.toBeNull();
    await expect(storage.statOriginal('k', 'abc')).rejects.toThrow();
  });

  it('should store a variant for the CDN to cache for good', async () => {
    const send = vi.spyOn(s3Client, 'send').mockResolvedValue({} as never);

    await storage.putPublic({
      key: 'v.webp',
      bytes: new Uint8Array(1),
      contentType: 'image/webp',
    });

    const command = send.mock.calls[0]?.[0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: 'public-bucket',
      Key: 'v.webp',
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    });
  });

  it('should store an export as UTF-8 CSV in the private bucket', async () => {
    const send = vi.spyOn(s3Client, 'send').mockResolvedValue({} as never);

    await storage.putExport({ key: 'exports/c/e.csv', content: 'name\r\n' });

    const command = send.mock.calls[0]?.[0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual({
      Bucket: 'private-bucket',
      Key: 'exports/c/e.csv',
      Body: 'name\r\n',
      ContentType: 'text/csv; charset=utf-8',
    });
  });

  it('should delete public variants in one request and fail on any kept', async () => {
    const send = vi
      .spyOn(s3Client, 'send')
      .mockResolvedValueOnce({} as never)
      .mockResolvedValueOnce({ Errors: [{ Code: 'AccessDenied' }] } as never);

    await storage.deletePublic(['a', 'b']);
    await expect(storage.deletePublic(['a'])).rejects.toThrow('AccessDenied');
    await storage.deletePublic([]);

    const command = send.mock.calls[0]?.[0] as DeleteObjectsCommand;
    expect(command).toBeInstanceOf(DeleteObjectsCommand);
    expect(command.input.Delete?.Objects).toEqual([{ Key: 'a' }, { Key: 'b' }]);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("should list an owner's prefix page by page in both buckets and delete what each page holds", async () => {
    // The private bucket answers in two pages; the public one holds nothing.
    const answer = (command: unknown) => {
      if (!(command instanceof ListObjectsV2Command)) {
        return {};
      }

      const { Bucket, ContinuationToken } = command.input;

      if (Bucket === 'public-bucket') {
        return {};
      }

      return ContinuationToken
        ? { Contents: [{ Key: 'lesson/l/b' }] }
        : { Contents: [{ Key: 'lesson/l/a' }], NextContinuationToken: 't' };
    };
    const send = vi
      .spyOn(s3Client, 'send')
      .mockImplementation(((command: unknown) =>
        Promise.resolve(answer(command))) as never);

    await storage.deleteOwnerFiles({ ownerType: 'lesson', ownerId: 'l' });

    const commands = send.mock.calls.map(([command]) => command);
    const listings = commands.filter(
      (command) => command instanceof ListObjectsV2Command,
    );
    const deletions = commands.filter(
      (command) => command instanceof DeleteObjectsCommand,
    );
    expect(listings.map(({ input }) => input)).toEqual(
      expect.arrayContaining([
        { Bucket: 'private-bucket', Prefix: 'lesson/l/' },
        {
          Bucket: 'private-bucket',
          Prefix: 'lesson/l/',
          ContinuationToken: 't',
        },
        { Bucket: 'public-bucket', Prefix: 'lesson/l/' },
      ]),
    );
    expect(listings).toHaveLength(3);
    expect(
      deletions.map(({ input }) => [input.Bucket, input.Delete?.Objects]),
    ).toEqual([
      ['private-bucket', [{ Key: 'lesson/l/a' }]],
      ['private-bucket', [{ Key: 'lesson/l/b' }]],
    ]);
  });

  it('should open a multipart upload with the type the object will take', async () => {
    const send = vi
      .spyOn(s3Client, 'send')
      .mockResolvedValue({ UploadId: 'u--1' } as never);

    await expect(
      storage.startMultipart({
        key: 'lesson/l/video/f/original',
        contentType: 'video/mp4',
      }),
    ).resolves.toBe('u--1');

    const command = send.mock.calls[0]?.[0] as CreateMultipartUploadCommand;
    expect(command).toBeInstanceOf(CreateMultipartUploadCommand);
    expect(command.input).toEqual({
      Bucket: 'private-bucket',
      Key: 'lesson/l/video/f/original',
      ContentType: 'video/mp4',
    });
  });

  it('should sign each part for its exact length, for an hour', async () => {
    const { urls, expiresAt } = await storage.signParts({
      key: 'lesson/l/video/f/original',
      uploadId: 'u--1',
      parts: [
        { partNumber: 1, length: 16 },
        { partNumber: 2, length: 4 },
      ],
    });

    expect(urls.map(({ partNumber }) => partNumber)).toEqual([1, 2]);
    const query = new URL(urls[1]?.url ?? '').searchParams;
    expect(query.get('partNumber')).toBe('2');
    expect(query.get('uploadId')).toBe('u--1');
    expect(query.get('X-Amz-Expires')).toBe('3600');
    expect(query.get('X-Amz-SignedHeaders')).toBe('content-length;host');
    expect(Date.parse(expiresAt) - Date.now()).toBeGreaterThan(3590 * 1000);
  });

  it('should complete with the recorded size and the parts in order', async () => {
    const send = vi.spyOn(s3Client, 'send').mockResolvedValue({} as never);

    await expect(
      storage.completeMultipart({
        key: 'k',
        uploadId: 'u',
        size: 20,
        parts: [
          { partNumber: 1, eTag: '"a"' },
          { partNumber: 2, eTag: '"b"' },
        ],
      }),
    ).resolves.toBe('completed');

    const command = send.mock.calls[0]?.[0] as CompleteMultipartUploadCommand;
    expect(command).toBeInstanceOf(CompleteMultipartUploadCommand);
    expect(command.input).toEqual({
      Bucket: 'private-bucket',
      Key: 'k',
      UploadId: 'u',
      MpuObjectSize: 20,
      MultipartUpload: {
        Parts: [
          { PartNumber: 1, ETag: '"a"' },
          { PartNumber: 2, ETag: '"b"' },
        ],
      },
    });
  });

  it('should tell parts S3 refuses from an upload that is gone', async () => {
    const invalidPart = new S3ServiceException({
      name: 'InvalidPart',
      $fault: 'client',
      $metadata: { httpStatusCode: 400 },
    });
    vi.spyOn(s3Client, 'send')
      .mockRejectedValueOnce(invalidPart)
      .mockRejectedValueOnce(
        new NoSuchUpload({ message: 'gone', $metadata: {} }),
      );
    const completion = { key: 'k', uploadId: 'u', size: 1, parts: [] };

    await expect(storage.completeMultipart(completion)).resolves.toBe(
      'invalid-parts',
    );
    await expect(storage.completeMultipart(completion)).resolves.toBe(
      'no-upload',
    );
  });

  it('should abort until no part is left, and take a gone upload as aborted', async () => {
    const send = vi
      .spyOn(s3Client, 'send')
      .mockResolvedValueOnce({} as never)
      .mockResolvedValueOnce({ Parts: [{ PartNumber: 2 }] } as never)
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(
        new NoSuchUpload({ message: 'gone', $metadata: {} }),
      );

    await storage.abortMultipart({ key: 'k', uploadId: 'u' });

    const commands = send.mock.calls.map(([command]) => command);
    expect(commands).toHaveLength(4);
    expect(commands[0]).toBeInstanceOf(AbortMultipartUploadCommand);
    expect(commands[1]).toBeInstanceOf(ListPartsCommand);
    expect(commands[2]).toBeInstanceOf(AbortMultipartUploadCommand);
    expect(commands[0]?.input).toEqual({
      Bucket: 'private-bucket',
      Key: 'k',
      UploadId: 'u',
    });
  });
});
