import type { Course } from '@application/entities/course/Course';
import type { Enrollment } from '@application/entities/enrollment/Enrollment';
import type { PublicAssetUrls } from '@application/gateways/file/PublicAssetUrls';

export class EnrollmentSummary {
  readonly courseId: string;
  readonly title: string;
  readonly instructorName: string;
  readonly lessonCount: number;
  readonly completedLessons: number;
  readonly enrolledAt: string;
  readonly courseStatus: Course.Status;
  // Variant width → CDN URL; absent until a cover is processed (Q401).
  readonly coverUrl: Record<string, string> | undefined;

  constructor(attributes: EnrollmentSummary) {
    this.courseId = attributes.courseId;
    this.title = attributes.title;
    this.instructorName = attributes.instructorName;
    this.lessonCount = attributes.lessonCount;
    this.completedLessons = attributes.completedLessons;
    this.enrolledAt = attributes.enrolledAt;
    this.courseStatus = attributes.courseStatus;
    this.coverUrl = attributes.coverUrl;
  }

  static fromEnrollment(
    enrollment: Enrollment,
    course: Course,
    assetUrls: PublicAssetUrls,
  ): EnrollmentSummary {
    return new EnrollmentSummary({
      courseId: enrollment.courseId,
      title: course.title,
      instructorName: course.instructorName,
      lessonCount: course.lessonCount,
      completedLessons: enrollment.completedLessons,
      enrolledAt: enrollment.enrolledAt.toISOString(),
      courseStatus: course.status,
      coverUrl: assetUrls.urlsOf(course.cover),
    });
  }
}
