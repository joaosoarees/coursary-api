import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { StudentExport } from '@application/entities/export/StudentExport';
import { StudentExportItem } from '@infra/database/dynamo/items/export/StudentExportItem';

describe('StudentExportItem', () => {
  it('should keep the export by its id, expiring a week after it was asked for', () => {
    const instructor = Account.create({ name: 'Ana', email: 'a@example.com' });
    const course = Course.create({ instructor, title: 'DynamoDB' });
    const studentExport = StudentExport.create({
      courseId: course.id,
      requestedBy: instructor.id,
    });
    studentExport.ready(3);

    const item = StudentExportItem.fromEntity(studentExport).toItem();

    expect(item).toMatchObject({
      PK: `EXPORT#${studentExport.id}`,
      SK: `EXPORT#${studentExport.id}`,
      type: 'StudentExport',
      status: 'READY',
      rowCount: 3,
      fileKey: studentExport.fileKey,
      expiresAt:
        Math.floor(studentExport.createdAt.getTime() / 1000) + 7 * 24 * 3600,
    });
    expect(StudentExportItem.toEntity(item)).toEqual(studentExport);
  });
});
