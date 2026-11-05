import { describe, expect, it } from 'vitest';

import { FakeFileStorage } from '@tests/fakes/FakeFileStorage';
import { accountWorld } from '@tests/support/accountWorld';

import { accountRoles } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { CourseNotFound } from '@application/errors/course';
import { FileNotFound } from '@application/errors/file';
import { GetCoverUploadUseCase } from '@application/usecases/file/GetCoverUploadUseCase';
import { RequestCoverUploadUseCase } from '@application/usecases/file/RequestCoverUploadUseCase';

const { addAccount, courses, files, unitOfWork } = accountWorld();

const getUpload = new GetCoverUploadUseCase(courses, files);

const sendCover = async () => {
  const instructor = await addAccount({ role: accountRoles.Instructor });
  const course = Course.create({ instructor, title: 'DynamoDB' });
  await courses.create(course);
  const editor = {
    callerId: instructor.id,
    callerRole: instructor.role,
    courseId: course.id,
  };
  const { fileId } = await new RequestCoverUploadUseCase(
    courses,
    files,
    new FakeFileStorage(),
  ).execute({ ...editor, contentType: 'image/png' });

  return { editor, fileId };
};

describe('GetCoverUploadUseCase', () => {
  it('should show a waiting upload as pending', async () => {
    const { editor, fileId } = await sendCover();

    await expect(getUpload.execute({ ...editor, fileId })).resolves.toEqual({
      status: 'PENDING',
    });
  });

  it('should show an admin a processed upload as processed', async () => {
    const { editor, fileId } = await sendCover();
    const file = await files.find({
      ownerType: 'course',
      ownerId: editor.courseId,
      purpose: 'cover',
      id: fileId,
    });

    if (!file) {
      throw new Error('The upload was not recorded.');
    }

    file.process({ size: 10, variants: { '480': 'a.webp', '1280': 'b.webp' } });
    const unit = unitOfWork();
    unit.add(files.markProcessedOperation(file));
    await unit.commit();
    const admin = await addAccount({ role: accountRoles.Admin });

    await expect(
      getUpload.execute({
        ...editor,
        callerId: admin.id,
        callerRole: admin.role,
        fileId,
      }),
    ).resolves.toEqual({ status: 'PROCESSED' });
  });

  it('should show a refused upload as failed', async () => {
    const { editor, fileId } = await sendCover();
    const file = await files.find({
      ownerType: 'course',
      ownerId: editor.courseId,
      purpose: 'cover',
      id: fileId,
    });

    if (!file) {
      throw new Error('The upload was not recorded.');
    }

    file.fail(10);
    await files.markFailed(file);

    await expect(getUpload.execute({ ...editor, fileId })).resolves.toEqual({
      status: 'FAILED',
    });
  });

  it("should not find another course's upload", async () => {
    const { fileId } = await sendCover();
    const { editor } = await sendCover();

    await expect(
      getUpload.execute({ ...editor, fileId }),
    ).rejects.toBeInstanceOf(FileNotFound);
  });

  it("should hide another instructor's draft", async () => {
    const { editor, fileId } = await sendCover();
    const other = await addAccount({ role: accountRoles.Instructor });

    await expect(
      getUpload.execute({
        ...editor,
        callerId: other.id,
        callerRole: other.role,
        fileId,
      }),
    ).rejects.toBeInstanceOf(CourseNotFound);
  });
});
