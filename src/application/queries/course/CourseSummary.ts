import type { Course } from '@application/entities/course/Course';

export class CourseSummary {
  readonly id: string;
  readonly title: string;
  readonly status: Course.Status;
  readonly lessonCount: number;
  readonly enrollmentCount: number;
  readonly publishedAt: string | null;
  readonly createdAt: string;

  constructor(attributes: CourseSummary) {
    this.id = attributes.id;
    this.title = attributes.title;
    this.status = attributes.status;
    this.lessonCount = attributes.lessonCount;
    this.enrollmentCount = attributes.enrollmentCount;
    this.publishedAt = attributes.publishedAt;
    this.createdAt = attributes.createdAt;
  }

  static fromCourse(course: Course): CourseSummary {
    return new CourseSummary({
      id: course.id,
      title: course.title,
      status: course.status,
      lessonCount: course.lessonCount,
      enrollmentCount: course.enrollmentCount,
      publishedAt: course.publishedAt?.toISOString() ?? null,
      createdAt: course.createdAt.toISOString(),
    });
  }
}
