import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { StudentExport } from '@application/entities/export/StudentExport';

const instructor = Account.create({ name: 'Ana', email: 'ana@example.com' });
const course = Course.create({ instructor, title: 'DynamoDB' });
const minutes = (count: number) => count * 60 * 1000;

const create = () =>
  StudentExport.create({ courseId: course.id, requestedBy: instructor.id });

describe('StudentExport.create', () => {
  it('should start pending, with its file under the course', () => {
    const created = create();

    expect(created).toMatchObject({
      courseId: course.id,
      requestedBy: instructor.id,
      status: 'PENDING',
      rowCount: undefined,
    });
    expect(StudentExport.isId(created.id)).toBe(true);
    expect(created.fileKey).toBe(`exports/${course.id}/${created.id}.csv`);
    expect(created.fileName).toBe(
      `students-${course.id}-${created.createdAt.toISOString().slice(0, 10)}.csv`,
    );
  });
});

describe('StudentExport.statusAt', () => {
  it('should read a pending export past 15 minutes as failed', () => {
    const created = create();
    const at = (offset: number) =>
      new Date(created.createdAt.getTime() + offset);

    expect(created.statusAt(at(minutes(15)))).toBe('PENDING');
    expect(created.statusAt(at(minutes(15) + 1))).toBe('FAILED');
  });

  it('should keep a finished export as it is, however old', () => {
    const created = create();
    created.ready(2);
    const later = new Date(created.createdAt.getTime() + minutes(60));

    expect(created.statusAt(later)).toBe('READY');
    expect(created.rowCount).toBe(2);
  });
});

describe('StudentExport.pendingSince', () => {
  it('should be 15 minutes before now', () => {
    const now = new Date('2026-10-27T12:00:00.000Z');

    expect(StudentExport.pendingSince(now).toISOString()).toBe(
      '2026-10-27T11:45:00.000Z',
    );
  });
});
