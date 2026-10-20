import type { Course } from '@application/entities/course/Course';

// One shape for a course in the catalog and in search results (Q326, Q334).
export class CatalogItem {
  readonly id: string;
  readonly title: string;
  readonly instructorName: string;
  readonly lessonCount: number;
  readonly enrollmentCount: number;
  readonly ratingCount: number;
  // Computed on read; null before the first review (Q83, Q283).
  readonly ratingAverage: number | null;
  readonly publishedAt: string;

  constructor(attributes: CatalogItem) {
    this.id = attributes.id;
    this.title = attributes.title;
    this.instructorName = attributes.instructorName;
    this.lessonCount = attributes.lessonCount;
    this.enrollmentCount = attributes.enrollmentCount;
    this.ratingCount = attributes.ratingCount;
    this.ratingAverage = attributes.ratingAverage;
    this.publishedAt = attributes.publishedAt;
  }

  static fromCourse(course: Course): CatalogItem {
    return new CatalogItem({
      id: course.id,
      title: course.title,
      instructorName: course.instructorName,
      lessonCount: course.lessonCount,
      enrollmentCount: course.enrollmentCount,
      ratingCount: course.ratingCount,
      ratingAverage: course.ratingAverage(),
      publishedAt: course.publishedAt?.toISOString() ?? '',
    });
  }
}
