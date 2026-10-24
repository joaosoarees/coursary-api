import { describe, expect, it } from 'vitest';

import { FakePublicAssetUrls } from '@tests/fakes/FakePublicAssetUrls';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import type { File } from '@application/entities/file/File';
import { EnrollmentSummary } from '@application/queries/enrollment/EnrollmentSummary';

const instructor = Account.create({ name: 'Ana', email: 'ana@example.com' });

describe('EnrollmentSummary', () => {
  it('should serve the cover from the CDN, and leave it out without one', () => {
    const course = Course.create({ instructor, title: 'DynamoDB' });
    expect(
      EnrollmentSummary.fromEnrollment(
        Enrollment.create({ student: instructor, course }),
        course,
        new FakePublicAssetUrls(),
      ).coverUrl,
    ).toBeUndefined();

    course.cover = {
      fileId: 'f' as File.Id,
      variants: { 480: 'course/c/cover/f/480-a.webp' },
    };

    expect(
      EnrollmentSummary.fromEnrollment(
        Enrollment.create({ student: instructor, course }),
        course,
        new FakePublicAssetUrls(),
      ).coverUrl,
    ).toEqual({
      480: 'https://cdn.example.com/course/c/cover/f/480-a.webp',
    });
  });
});
