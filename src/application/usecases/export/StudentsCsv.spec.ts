import { describe, expect, it } from 'vitest';

import { StudentSummary } from '@application/queries/enrollment/StudentSummary';
import { StudentsCsv } from '@application/usecases/export/StudentsCsv';

const student = (studentName: string, completedLessons: number) =>
  new StudentSummary({
    accountId: 'a',
    studentName,
    enrolledAt: '2026-10-27T12:00:00.000Z',
    completedLessons,
  });

const linesOf = (csv: StudentsCsv) =>
  csv.content.replace(/^\uFEFF/, '').split('\r\n');

describe('StudentsCsv', () => {
  it('should write the header, one line per student and the progress in whole percent', () => {
    const csv = StudentsCsv.fromStudents(
      [student('Ana', 1), student('Bia', 3)],
      3,
    );

    expect(csv.content.startsWith('\uFEFF')).toBe(true);
    expect(csv.rowCount).toBe(2);
    expect(linesOf(csv)).toEqual([
      'name,enrolledAt,completedLessons,progress',
      'Ana,2026-10-27T12:00:00.000Z,1,33',
      'Bia,2026-10-27T12:00:00.000Z,3,100',
      '',
    ]);
  });

  it('should quote commas, quotes and line breaks, and disarm formulas', () => {
    const csv = StudentsCsv.fromStudents(
      [
        student('Silva, Ana', 0),
        student('Ana "Nina"', 0),
        student('=HYPERLINK("x")', 0),
        student('-1', 0),
        student('João', 0),
      ],
      2,
    );

    expect(
      linesOf(csv)
        .slice(1, 6)
        .map((line) => line.split(',2026')[0]),
    ).toEqual([
      '"Silva, Ana"',
      '"Ana ""Nina"""',
      `"'=HYPERLINK(""x"")"`,
      "'-1",
      'João',
    ]);
  });

  it('should give no progress in a course without lessons, and no lines without students', () => {
    expect(linesOf(StudentsCsv.fromStudents([student('Ana', 0)], 0))[1]).toBe(
      'Ana,2026-10-27T12:00:00.000Z,0,0',
    );
    expect(StudentsCsv.fromStudents([], 3).rowCount).toBe(0);
  });
});
