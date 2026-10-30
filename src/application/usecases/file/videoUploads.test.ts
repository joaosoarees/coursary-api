import { beforeEach, describe, expect, it } from 'vitest';

import { FakeFileStorage } from '@tests/fakes/FakeFileStorage';
import { courseWorld } from '@tests/support/courseWorld';

import type { Account } from '@application/entities/account/Account';
import type { File } from '@application/entities/file/File';
import type { Lesson } from '@application/entities/outline/Lesson';
import { Forbidden } from '@application/errors/common';
import { CourseArchived } from '@application/errors/course';
import {
  VideoNotFound,
  VideoPartsInvalid,
  VideoUploadNotFound,
} from '@application/errors/file';
import { LessonNotFound } from '@application/errors/outline';
import { AbortVideoUploadUseCase } from '@application/usecases/file/AbortVideoUploadUseCase';
import { CompleteVideoUploadUseCase } from '@application/usecases/file/CompleteVideoUploadUseCase';
import { DeleteVideoUseCase } from '@application/usecases/file/DeleteVideoUseCase';
import { RequestVideoUploadUseCase } from '@application/usecases/file/RequestVideoUploadUseCase';
import { SignVideoPartsUseCase } from '@application/usecases/file/SignVideoPartsUseCase';
import { VideoUploadLookup } from '@application/usecases/file/VideoUploadLookup';

const MEGABYTE = 1024 * 1024;

let world: Awaited<ReturnType<typeof courseWorld>>;
let storage: FakeFileStorage;
let lesson: Lesson;

const useCases = () => {
  const lookup = new VideoUploadLookup(
    world.courses,
    world.lessons,
    world.files,
  );

  return {
    request: new RequestVideoUploadUseCase(
      world.courses,
      world.lessons,
      world.files,
      storage,
    ),
    sign: new SignVideoPartsUseCase(lookup, storage),
    complete: new CompleteVideoUploadUseCase(lookup, storage),
    abort: new AbortVideoUploadUseCase(lookup, world.files, storage),
    remove: new DeleteVideoUseCase(
      world.courses,
      world.lessons,
      world.files,
      storage,
    ),
  };
};

const reference = (id: File.Id): File.Reference => ({
  ownerType: 'lesson',
  ownerId: lesson.id,
  purpose: 'video',
  id,
});

const start = (caller: Account = world.owner, size = 20 * MEGABYTE) =>
  useCases().request.execute({
    ...world.as(caller),
    lessonId: lesson.id,
    contentType: 'video/mp4',
    size,
  });

const twoParts = [
  { partNumber: 2, eTag: '"b"' },
  { partNumber: 1, eTag: '"a"' },
];

beforeEach(async () => {
  world = await courseWorld();
  storage = new FakeFileStorage();
  const module = await world.addModule('M1', 0);
  lesson = await world.addLesson(module, 0);
});

describe('RequestVideoUploadUseCase', () => {
  it('should open the upload before recording it, with the size and the parts', async () => {
    const { fileId, partSize, partCount } = await start();

    const file = await world.files.find(reference(fileId));
    expect(file).toMatchObject({
      status: 'PENDING',
      size: 20 * MEGABYTE,
      uploadId: 'upload-1',
    });
    expect(storage.multipartUploads.get('upload-1')).toEqual({
      key: `lesson/${lesson.id}/video/${fileId}/original`,
      contentType: 'video/mp4',
    });
    expect({ partSize, partCount }).toEqual({
      partSize: 16 * MEGABYTE,
      partCount: 2,
    });
  });

  it('should abort the upload still pending in the lesson and drop its record', async () => {
    const first = await start();

    await start();

    expect(storage.multipartUploads.has('upload-1')).toBe(false);
    expect(storage.multipartUploads.has('upload-2')).toBe(true);
    await expect(world.files.find(reference(first.fileId))).resolves.toBeNull();
  });

  it('should keep a pending video that S3 already completed, for processUpload to confirm', async () => {
    const first = await start();
    await useCases().complete.execute({
      ...world.as(world.owner),
      lessonId: lesson.id,
      fileId: first.fileId,
      parts: twoParts,
    });

    await start();

    await expect(
      world.files.find(reference(first.fileId)),
    ).resolves.toMatchObject({
      status: 'PENDING',
    });
  });

  it('should refuse another instructor, another lesson and an archived course', async () => {
    await world.setCourse({ status: 'PUBLISHED' });
    await expect(start(world.other)).rejects.toBeInstanceOf(Forbidden);
    await expect(
      useCases().request.execute({
        ...world.as(world.owner),
        lessonId: world.course.id as unknown as Lesson.Id,
        contentType: 'video/mp4',
        size: 1,
      }),
    ).rejects.toBeInstanceOf(LessonNotFound);

    await world.setCourse({ status: 'ARCHIVED' });
    await expect(start()).rejects.toBeInstanceOf(CourseArchived);
    expect(storage.multipartUploads.size).toBe(0);
  });
});

describe('SignVideoPartsUseCase', () => {
  it('should sign each part for the length the recorded size gives it', async () => {
    const { fileId } = await start();

    const { urls } = await useCases().sign.execute({
      ...world.as(world.owner),
      lessonId: lesson.id,
      fileId,
      partNumbers: [1, 2],
    });

    expect(urls.map(({ partNumber }) => partNumber)).toEqual([1, 2]);
    expect(storage.signedParts.at(-1)?.parts).toEqual([
      { partNumber: 1, length: 16 * MEGABYTE },
      { partNumber: 2, length: 4 * MEGABYTE },
    ]);
  });

  it('should refuse a part the video does not have, another instructor and an unknown upload', async () => {
    const { fileId } = await start();
    const sign = (caller: Account, partNumbers: number[], id = fileId) =>
      useCases().sign.execute({
        ...world.as(caller),
        lessonId: lesson.id,
        fileId: id,
        partNumbers,
      });

    await expect(sign(world.owner, [3])).rejects.toBeInstanceOf(
      VideoPartsInvalid,
    );
    // A draft is hidden from other instructors; a published course refuses them.
    await world.setCourse({ status: 'PUBLISHED' });
    await expect(sign(world.other, [1])).rejects.toBeInstanceOf(Forbidden);
    await expect(
      sign(world.owner, [1], 'x'.repeat(27) as File.Id),
    ).rejects.toBeInstanceOf(VideoUploadNotFound);
  });
});

describe('CompleteVideoUploadUseCase', () => {
  it('should join the parts in order under the recorded size', async () => {
    const { fileId } = await start();
    const key = `lesson/${lesson.id}/video/${fileId}/original`;

    await useCases().complete.execute({
      ...world.as(world.owner),
      lessonId: lesson.id,
      fileId,
      parts: twoParts,
    });

    expect(storage.originals.get(key)?.bytes.length).toBe(20 * MEGABYTE);
    expect(storage.multipartUploads.size).toBe(0);
  });

  it('should refuse a list that leaves out a part, and parts S3 refuses', async () => {
    const { fileId } = await start();
    const complete = (parts: typeof twoParts) =>
      useCases().complete.execute({
        ...world.as(world.owner),
        lessonId: lesson.id,
        fileId,
        parts,
      });

    await expect(complete(twoParts.slice(0, 1))).rejects.toBeInstanceOf(
      VideoPartsInvalid,
    );
    storage.refuseParts = true;
    await expect(complete(twoParts)).rejects.toBeInstanceOf(VideoPartsInvalid);
  });

  it('should answer a retry once the video is confirmed, and 404 once the upload is gone', async () => {
    const { fileId } = await start();
    const complete = () =>
      useCases().complete.execute({
        ...world.as(world.owner),
        lessonId: lesson.id,
        fileId,
        parts: twoParts,
      });
    await complete();

    // Completed in S3, not yet confirmed: S3 no longer knows the upload.
    await expect(complete()).rejects.toBeInstanceOf(VideoUploadNotFound);

    const file = await world.files.find(reference(fileId));

    if (!file) {
      throw new Error('The pending video was not recorded.');
    }

    file.markUploaded(20 * MEGABYTE);
    await world.files.markUploaded(file);

    await expect(complete()).resolves.toBeUndefined();
  });
});

describe('AbortVideoUploadUseCase', () => {
  it('should abort the upload, then drop the record', async () => {
    const { fileId } = await start();
    const abort = () =>
      useCases().abort.execute({
        ...world.as(world.owner),
        lessonId: lesson.id,
        fileId,
      });

    await abort();

    expect(storage.multipartUploads.size).toBe(0);
    await expect(world.files.find(reference(fileId))).resolves.toBeNull();
    await expect(abort()).rejects.toBeInstanceOf(VideoUploadNotFound);
  });
});

describe('DeleteVideoUseCase', () => {
  const sendVideo = async () => {
    const { fileId } = await start();
    await useCases().complete.execute({
      ...world.as(world.owner),
      lessonId: lesson.id,
      fileId,
      parts: twoParts,
    });
    const file = await world.files.find(reference(fileId));

    if (!file) {
      throw new Error('The video was not recorded.');
    }

    file.markUploaded(20 * MEGABYTE);
    await world.files.markUploaded(file);

    return file;
  };

  const remove = (caller: Account = world.owner) =>
    useCases().remove.execute({ ...world.as(caller), lessonId: lesson.id });

  it('should delete the sent video, record and object, and leave an upload in progress', async () => {
    const sent = await sendVideo();
    const inProgress = await start();

    await remove();

    await expect(world.files.find(sent)).resolves.toBeNull();
    expect(storage.originals.has(sent.originalKey)).toBe(false);
    await expect(
      world.files.find(reference(inProgress.fileId)),
    ).resolves.toMatchObject({ status: 'PENDING' });
    await expect(remove()).rejects.toBeInstanceOf(VideoNotFound);
  });

  it('should refuse another instructor and an archived course', async () => {
    await sendVideo();
    await world.setCourse({ status: 'PUBLISHED' });

    await expect(remove(world.other)).rejects.toBeInstanceOf(Forbidden);

    await world.setCourse({ status: 'ARCHIVED' });
    await expect(remove()).rejects.toBeInstanceOf(CourseArchived);
  });
});
