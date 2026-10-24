import type { Course } from '@application/entities/course/Course';
import type { PublicAssetUrls } from '@application/gateways/file/PublicAssetUrls';

export class CourseSummary {
  readonly id: string;
  readonly title: string;
  readonly status: Course.Status;
  readonly lessonCount: number;
  readonly enrollmentCount: number;
  readonly publishedAt: string | null;
  readonly createdAt: string;
  // Variant width → CDN URL; absent until a cover is processed (Q401).
  readonly coverUrl: Record<string, string> | undefined;

  constructor(attributes: CourseSummary) {
    this.id = attributes.id;
    this.title = attributes.title;
    this.status = attributes.status;
    this.lessonCount = attributes.lessonCount;
    this.enrollmentCount = attributes.enrollmentCount;
    this.publishedAt = attributes.publishedAt;
    this.createdAt = attributes.createdAt;
    this.coverUrl = attributes.coverUrl;
  }

  static fromCourse(course: Course, assetUrls: PublicAssetUrls): CourseSummary {
    return new CourseSummary({
      id: course.id,
      title: course.title,
      status: course.status,
      lessonCount: course.lessonCount,
      enrollmentCount: course.enrollmentCount,
      publishedAt: course.publishedAt?.toISOString() ?? null,
      createdAt: course.createdAt.toISOString(),
      coverUrl: assetUrls.urlsOf(course.cover),
    });
  }
}
