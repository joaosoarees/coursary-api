import type { Lesson } from '@application/entities/outline/Lesson';

export class LessonDetails {
  readonly id: string;
  readonly moduleId: string;
  readonly title: string;
  readonly body: string;
  readonly durationMinutes: number;
  readonly position: number;

  constructor(attributes: LessonDetails) {
    this.id = attributes.id;
    this.moduleId = attributes.moduleId;
    this.title = attributes.title;
    this.body = attributes.body;
    this.durationMinutes = attributes.durationMinutes;
    this.position = attributes.position;
  }

  static fromLesson(lesson: Lesson): LessonDetails {
    return new LessonDetails({
      id: lesson.id,
      moduleId: lesson.moduleId,
      title: lesson.title,
      body: lesson.body,
      durationMinutes: lesson.durationMinutes,
      position: lesson.position,
    });
  }
}
