import { describe, expect, it } from 'vitest';

import { FakeFileStorage } from '@tests/fakes/FakeFileStorage';
import { accountWorld } from '@tests/support/accountWorld';
import { setCourseFields } from '@tests/support/courseWorld';

import { accountRoles } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Forbidden } from '@application/errors/common';
import { CourseArchived } from '@application/errors/course';
import { RequestCoverUploadUseCase } from '@application/usecases/file/RequestCoverUploadUseCase';

const { addAccount, courses, files } = accountWorld();

const setup = async () => {
  const storage = new FakeFileStorage();
  const instructor = await addAccount({ role: accountRoles.Instructor });
  const course = Course.create({ instructor, title: 'DynamoDB' });
  await courses.create(course);

  return {
    storage,
    instructor,
    course,
    requestUpload: new RequestCoverUploadUseCase(courses, files, storage),
  };
};

describe('RequestCoverUploadUseCase', () => {
  it("should record a pending cover and sign its key for the course's owner", async () => {
    const { storage, instructor, course, requestUpload } = await setup();

    const { fileId } = await requestUpload.execute({
      callerId: instructor.id,
      callerRole: instructor.role,
      courseId: course.id,
      contentType: 'image/jpeg',
    });

    await expect(
      files.find({
        ownerType: 'course',
        ownerId: course.id,
        purpose: 'cover',
        id: fileId,
      }),
    ).resolves.toMatchObject({ status: 'PENDING' });
    expect(storage.signed).toEqual([
      {
        key: `course/${course.id}/cover/${fileId}/original`,
        contentType: 'image/jpeg',
        maxBytes: 10 * 1024 * 1024,
      },
    ]);
  });

  it('should refuse another instructor of a published course', async () => {
    const { storage, course, requestUpload } = await setup();
    const other = await addAccount({ role: accountRoles.Instructor });
    await setCourseFields(course, { status: 'PUBLISHED' });

    await expect(
      requestUpload.execute({
        callerId: other.id,
        callerRole: other.role,
        courseId: course.id,
        contentType: 'image/png',
      }),
    ).rejects.toBeInstanceOf(Forbidden);
    expect(storage.signed).toEqual([]);
  });

  it('should refuse an archived course', async () => {
    const { storage, instructor, course, requestUpload } = await setup();
    await setCourseFields(course, { status: 'ARCHIVED' });

    await expect(
      requestUpload.execute({
        callerId: instructor.id,
        callerRole: instructor.role,
        courseId: course.id,
        contentType: 'image/png',
      }),
    ).rejects.toBeInstanceOf(CourseArchived);
    expect(storage.signed).toEqual([]);
  });
});
