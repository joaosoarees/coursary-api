import type { StudentSummary } from '@application/queries/enrollment/StudentSummary';

// Excel reads UTF-8 only with the mark; without it the accents break.
const BYTE_ORDER_MARK = '\uFEFF';

// A spreadsheet runs a cell that starts with these as a formula (CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/;

const NEEDS_QUOTES = /[",\r\n]/;

// The students of a course, without e-mail (Q384, Q424).
export class StudentsCsv {
  static readonly header = [
    'name',
    'enrolledAt',
    'completedLessons',
    'progress',
  ];

  constructor(
    readonly content: string,
    readonly rowCount: number,
  ) {}

  static fromStudents(
    students: StudentSummary[],
    lessonCount: number,
  ): StudentsCsv {
    const rows = students.map((student) => [
      student.studentName,
      student.enrolledAt,
      String(student.completedLessons),
      String(StudentsCsv.progressOf(student.completedLessons, lessonCount)),
    ]);
    const lines = [StudentsCsv.header, ...rows].map((cells) =>
      cells.map((cell) => StudentsCsv.cellOf(cell)).join(','),
    );

    return new StudentsCsv(
      `${BYTE_ORDER_MARK}${lines.join('\r\n')}\r\n`,
      rows.length,
    );
  }

  // A whole percentage; a course without lessons has none to complete.
  private static progressOf(completed: number, lessonCount: number): number {
    return lessonCount > 0
      ? Math.min(100, Math.round((completed / lessonCount) * 100))
      : 0;
  }

  private static cellOf(value: string): string {
    const safe = FORMULA_START.test(value) ? `'${value}` : value;

    return NEEDS_QUOTES.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
  }
}
