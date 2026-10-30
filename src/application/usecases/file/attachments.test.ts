import { beforeEach, describe, expect, it } from 'vitest';

import { FakeFileStorage } from '@tests/fakes/FakeFileStorage';
import { uniqueEmail } from '@tests/support/accountWorld';
import { courseWorld } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import { File } from '@application/entities/file/File';
import type { Lesson } from '@application/entities/outline/Lesson';
import { Forbidden } from '@application/errors/common';
import { CourseArchived } from '@application/errors/course';
import {
  AttachmentLimit,
  AttachmentNotFound,
  AttachmentOrderMismatch,
} from '@application/errors/file';
import { LessonNotFound } from '@application/errors/outline';
import { DeleteAttachmentUseCase } from '@application/usecases/file/DeleteAttachmentUseCase';
import { GetAttachmentDownloadUseCase } from '@application/usecases/file/GetAttachmentDownloadUseCase';
import { ReorderAttachmentsUseCase } from '@application/usecases/file/ReorderAttachmentsUseCase';
import { RequestAttachmentUploadUseCase } from '@application/usecases/file/RequestAttachmentUploadUseCase';

let world: Awaited<ReturnType<typeof courseWorld>>;
let storage: FakeFileStorage;
let lesson: Lesson;
let student: Account;

const useCases = () => ({
  request: new RequestAttachmentUploadUseCase(
    world.courses,
    world.lessons,
    world.files,
    storage,
  ),
  download: new GetAttachmentDownloadUseCase(
    world.courses,
    world.enrollments,
    world.lessons,
    world.files,
    storage,
  ),
  remove: new DeleteAttachmentUseCase(
    world.courses,
    world.lessons,
    world.files,
    storage,
  ),
  reorder: new ReorderAttachmentsUseCase(
    world.courses,
    world.lessons,
    world.files,
    world.unitOfWork,
  ),
});

const sendMaterial = async (name: string) => {
  const { fileId } = await useCases().request.execute({
    ...world.as(world.owner),
    lessonId: lesson.id,
    contentType: 'application/pdf',
    fileName: name,
  });
  const reference: File.Reference = {
    ownerType: 'lesson',
    ownerId: lesson.id,
    purpose: 'attachment',
    id: fileId,
  };
  const file = await world.files.find(reference);

  if (!file) {
    throw new Error('The pending material was not recorded.');
  }

  file.markUploaded(10);
  await world.files.markUploaded(file);

  return fileId;
};

const enrollStudent = async () => {
  const enrollment = Enrollment.create({ student, course: world.course });
  const unit = world.unitOfWork();
  unit.add(world.enrollments.createOperation(enrollment));
  await unit.commit();
};

beforeEach(async () => {
  world = await courseWorld();
  storage = new FakeFileStorage();
  const module = await world.addModule('M1', 0);
  lesson = await world.addLesson(module, 0);
  student = Account.create({ name: 'Duda', email: uniqueEmail('duda') });
  await world.accounts.create(student);
});

describe('RequestAttachmentUploadUseCase', () => {
  it('should record pending material at the next position and sign its key', async () => {
    const first = await sendMaterial('A.pdf');
    const { fileId } = await useCases().request.execute({
      ...world.as(world.owner),
      lessonId: lesson.id,
      contentType: 'text/plain',
      fileName: 'B.txt',
    });

    const listed = await world.files.listByOwner(
      { ownerType: 'lesson', ownerId: lesson.id },
      'attachment',
    );
    expect(listed.find((file) => file.id === fileId)).toMatchObject({
      status: 'PENDING',
      name: 'B.txt',
      position: 1,
    });
    expect(listed.find((file) => file.id === first)?.position).toBe(0);
    expect(storage.signed.at(-1)).toEqual({
      key: `lesson/${lesson.id}/attachment/${fileId}/original`,
      contentType: 'text/plain',
      maxBytes: 50 * 1024 * 1024,
    });
  });

  it('should refuse another instructor, an archived course, another lesson and the 21st file', async () => {
    const request = (caller: Account, lessonId = lesson.id) =>
      useCases().request.execute({
        ...world.as(caller),
        lessonId,
        contentType: 'application/pdf',
        fileName: 'X.pdf',
      });

    await world.setCourse({ status: 'PUBLISHED' });
    await expect(request(world.other)).rejects.toBeInstanceOf(Forbidden);
    await expect(
      request(world.owner, world.course.id as unknown as Lesson.Id),
    ).rejects.toBeInstanceOf(LessonNotFound);

    for (let index = 0; index < 20; index++) {
      await request(world.owner);
    }
    await expect(request(world.owner)).rejects.toBeInstanceOf(AttachmentLimit);

    await world.setCourse({ status: 'ARCHIVED' });
    await expect(request(world.owner)).rejects.toBeInstanceOf(CourseArchived);
  });
});

describe('GetAttachmentDownloadUseCase', () => {
  it('should sign a download for an active student and refuse anyone else', async () => {
    const fileId = await sendMaterial('Slides.pdf');
    await world.setCourse({ status: 'PUBLISHED' });
    const download = (caller: Account, id = fileId) =>
      useCases().download.execute({
        ...world.as(caller),
        lessonId: lesson.id,
        fileId: id,
      });

    await expect(download(student)).rejects.toBeInstanceOf(Forbidden);
    await enrollStudent();

    const signed = await download(student);
    expect(signed.url).toContain('name=Slides.pdf');
    expect(signed.expiresIn).toBe(300);
    await expect(
      download(student, 'x'.repeat(27) as File.Id),
    ).rejects.toBeInstanceOf(AttachmentNotFound);
  });

  it('should keep the material for the enrolled students of an archived course', async () => {
    const fileId = await sendMaterial('Slides.pdf');
    await world.setCourse({ status: 'PUBLISHED' });
    await enrollStudent();
    await world.setCourse({ status: 'ARCHIVED' });

    const signed = await useCases().download.execute({
      ...world.as(student),
      lessonId: lesson.id,
      fileId,
    });

    expect(signed.url).toContain('name=Slides.pdf');
  });

  it('should not hand out material that was never sent', async () => {
    const { fileId } = await useCases().request.execute({
      ...world.as(world.owner),
      lessonId: lesson.id,
      contentType: 'application/pdf',
      fileName: 'Pending.pdf',
    });

    await expect(
      useCases().download.execute({
        ...world.as(world.owner),
        lessonId: lesson.id,
        fileId,
      }),
    ).rejects.toBeInstanceOf(AttachmentNotFound);
  });
});

describe('DeleteAttachmentUseCase', () => {
  it('should delete the record and then the object, once', async () => {
    const fileId = await sendMaterial('Old.pdf');
    const key = `lesson/${lesson.id}/attachment/${fileId}/original`;
    storage.originals.set(key, { bytes: new Uint8Array(1), eTag: 'e' });
    const remove = () =>
      useCases().remove.execute({
        ...world.as(world.owner),
        lessonId: lesson.id,
        fileId,
      });

    await remove();

    expect(storage.originals.has(key)).toBe(false);
    await expect(remove()).rejects.toBeInstanceOf(AttachmentNotFound);
  });
});

describe('ReorderAttachmentsUseCase', () => {
  it('should rewrite the positions in the order given', async () => {
    const first = await sendMaterial('A.pdf');
    const second = await sendMaterial('B.pdf');

    const reordered = await useCases().reorder.execute({
      ...world.as(world.owner),
      lessonId: lesson.id,
      fileIds: [second, first],
    });

    expect(reordered.map((item) => item.name)).toEqual(['B.pdf', 'A.pdf']);
    const listed = await world.files.listByOwner(
      { ownerType: 'lesson', ownerId: lesson.id },
      'attachment',
    );
    expect(listed.find((file) => file.id === second)?.position).toBe(0);
  });

  it('should refuse an order that leaves out or repeats a material', async () => {
    const first = await sendMaterial('A.pdf');
    await sendMaterial('B.pdf');
    const reorder = (fileIds: string[]) =>
      useCases().reorder.execute({
        ...world.as(world.owner),
        lessonId: lesson.id,
        fileIds,
      });

    await expect(reorder([first])).rejects.toBeInstanceOf(
      AttachmentOrderMismatch,
    );
    await expect(reorder([first, first])).rejects.toBeInstanceOf(
      AttachmentOrderMismatch,
    );
  });
});
