import type { Course } from '@application/entities/course/Course';
import type { PublicAssetUrls } from '@application/gateways/file/PublicAssetUrls';

export class CatalogItem {
  readonly id: string;
  readonly title: string;
  readonly instructorName: string;
  readonly lessonCount: number;
  readonly enrollmentCount: number;
  readonly ratingCount: number;
  readonly ratingAverage: number | null;
  readonly publishedAt: string;
  readonly coverUrl: Record<string, string> | undefined;

  constructor(attributes: CatalogItem) {
    this.id = attributes.id;
    this.title = attributes.title;
    this.instructorName = attributes.instructorName;
    this.lessonCount = attributes.lessonCount;
    this.enrollmentCount = attributes.enrollmentCount;
    this.ratingCount = attributes.ratingCount;
    this.ratingAverage = attributes.ratingAverage;
    this.publishedAt = attributes.publishedAt;
    this.coverUrl = attributes.coverUrl;
  }

  static fromCourse(course: Course, assetUrls: PublicAssetUrls): CatalogItem {
    return new CatalogItem({
      id: course.id,
      title: course.title,
      instructorName: course.instructorName,
      lessonCount: course.lessonCount,
      enrollmentCount: course.enrollmentCount,
      ratingCount: course.ratingCount,
      ratingAverage: course.ratingAverage(),
      publishedAt: course.publishedAt?.toISOString() ?? '',
      coverUrl: assetUrls.urlsOf(course.cover),
    });
  }
}
