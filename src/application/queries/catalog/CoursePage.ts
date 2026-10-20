import type { Course } from '@application/entities/course/Course';
import { CatalogItem } from '@application/queries/catalog/CatalogItem';
import type { CourseOutline } from '@application/queries/outline/CourseOutline';
import type { OutlineModule } from '@application/queries/outline/OutlineModule';

// The public page: the catalog item, its description and outline (Q235, Q336).
export class CoursePage {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly instructorName: string;
  readonly lessonCount: number;
  readonly enrollmentCount: number;
  readonly ratingCount: number;
  readonly ratingAverage: number | null;
  readonly publishedAt: string;
  readonly modules: OutlineModule[];

  constructor(attributes: CoursePage) {
    this.id = attributes.id;
    this.title = attributes.title;
    this.description = attributes.description;
    this.instructorName = attributes.instructorName;
    this.lessonCount = attributes.lessonCount;
    this.enrollmentCount = attributes.enrollmentCount;
    this.ratingCount = attributes.ratingCount;
    this.ratingAverage = attributes.ratingAverage;
    this.publishedAt = attributes.publishedAt;
    this.modules = attributes.modules;
  }

  static fromCourse(
    course: Course,
    description: string,
    outline: CourseOutline,
  ): CoursePage {
    const item = CatalogItem.fromCourse(course);

    return new CoursePage({
      id: item.id,
      title: item.title,
      description,
      instructorName: item.instructorName,
      lessonCount: item.lessonCount,
      enrollmentCount: item.enrollmentCount,
      ratingCount: item.ratingCount,
      ratingAverage: item.ratingAverage,
      publishedAt: item.publishedAt,
      modules: outline.modules,
    });
  }
}
