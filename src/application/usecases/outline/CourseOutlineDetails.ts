import type { Course } from '@application/entities/course/Course';
import type { CourseOutline } from '@application/queries/outline/CourseOutline';
import type { OutlineModule } from '@application/queries/outline/OutlineModule';

export class CourseOutlineDetails {
  readonly courseId: string;
  readonly title: string;
  readonly status: string;
  readonly modules: OutlineModule[];

  constructor(attributes: CourseOutlineDetails) {
    this.courseId = attributes.courseId;
    this.title = attributes.title;
    this.status = attributes.status;
    this.modules = attributes.modules;
  }

  static fromCourse(
    course: Course,
    outline: CourseOutline,
  ): CourseOutlineDetails {
    return new CourseOutlineDetails({
      courseId: course.id,
      title: course.title,
      status: course.status,
      modules: outline.modules,
    });
  }
}
