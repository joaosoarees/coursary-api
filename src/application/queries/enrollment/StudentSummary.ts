import type { Enrollment } from '@application/entities/enrollment/Enrollment';

export class StudentSummary {
  readonly accountId: string;
  readonly studentName: string;
  readonly enrolledAt: string;
  readonly completedLessons: number;

  constructor(attributes: StudentSummary) {
    this.accountId = attributes.accountId;
    this.studentName = attributes.studentName;
    this.enrolledAt = attributes.enrolledAt;
    this.completedLessons = attributes.completedLessons;
  }

  static fromEnrollment(enrollment: Enrollment): StudentSummary {
    return new StudentSummary({
      accountId: enrollment.accountId,
      studentName: enrollment.studentName,
      enrolledAt: enrollment.enrolledAt.toISOString(),
      completedLessons: enrollment.completedLessons,
    });
  }
}
