import type { Course } from '@application/entities/course/Course';

export class CourseDetails {
  readonly id: string;
  readonly instructorId: string;
  readonly instructorName: string;
  readonly title: string;
  readonly description: string;
  readonly status: Course.Status;
  readonly lessonCount: number;
  readonly enrollmentCount: number;
  readonly publishedAt: string | null;
  readonly createdAt: string;

  constructor(attributes: CourseDetails) {
    this.id = attributes.id;
    this.instructorId = attributes.instructorId;
    this.instructorName = attributes.instructorName;
    this.title = attributes.title;
    this.description = attributes.description;
    this.status = attributes.status;
    this.lessonCount = attributes.lessonCount;
    this.enrollmentCount = attributes.enrollmentCount;
    this.publishedAt = attributes.publishedAt;
    this.createdAt = attributes.createdAt;
  }

  static fromCourse(course: Course, description: string): CourseDetails {
    return new CourseDetails({
      id: course.id,
      instructorId: course.instructorId,
      instructorName: course.instructorName,
      title: course.title,
      description,
      status: course.status,
      lessonCount: course.lessonCount,
      enrollmentCount: course.enrollmentCount,
      publishedAt: course.publishedAt?.toISOString() ?? null,
      createdAt: course.createdAt.toISOString(),
    });
  }
}
