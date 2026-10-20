import type { Enrollment } from '@application/entities/enrollment/Enrollment';

export class EnrollmentDetails {
  readonly courseId: string;
  readonly status: Enrollment.Status;
  readonly enrolledAt: string;
  readonly completedLessons: number;

  constructor(attributes: EnrollmentDetails) {
    this.courseId = attributes.courseId;
    this.status = attributes.status;
    this.enrolledAt = attributes.enrolledAt;
    this.completedLessons = attributes.completedLessons;
  }

  static fromEnrollment(enrollment: Enrollment): EnrollmentDetails {
    return new EnrollmentDetails({
      courseId: enrollment.courseId,
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt.toISOString(),
      completedLessons: enrollment.completedLessons,
    });
  }
}
