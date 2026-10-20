import type { Course } from '@application/entities/course/Course';
import type { Enrollment } from '@application/entities/enrollment/Enrollment';

export class EnrollmentSummary {
  readonly courseId: string;
  readonly title: string;
  readonly instructorName: string;
  readonly lessonCount: number;
  readonly completedLessons: number;
  readonly enrolledAt: string;
  readonly courseStatus: Course.Status;

  constructor(attributes: EnrollmentSummary) {
    this.courseId = attributes.courseId;
    this.title = attributes.title;
    this.instructorName = attributes.instructorName;
    this.lessonCount = attributes.lessonCount;
    this.completedLessons = attributes.completedLessons;
    this.enrolledAt = attributes.enrolledAt;
    this.courseStatus = attributes.courseStatus;
  }

  static fromEnrollment(
    enrollment: Enrollment,
    course: Course,
  ): EnrollmentSummary {
    return new EnrollmentSummary({
      courseId: enrollment.courseId,
      title: course.title,
      instructorName: course.instructorName,
      lessonCount: course.lessonCount,
      completedLessons: enrollment.completedLessons,
      enrolledAt: enrollment.enrolledAt.toISOString(),
      courseStatus: course.status,
    });
  }
}
