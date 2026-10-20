import type { Lesson } from '@application/entities/outline/Lesson';

export class OutlineLesson {
  readonly id: string;
  readonly title: string;
  readonly durationMinutes: number;
  readonly position: number;

  constructor(attributes: OutlineLesson) {
    this.id = attributes.id;
    this.title = attributes.title;
    this.durationMinutes = attributes.durationMinutes;
    this.position = attributes.position;
  }

  static fromSummary(lesson: Lesson.Summary): OutlineLesson {
    return new OutlineLesson({
      id: lesson.id,
      title: lesson.title,
      durationMinutes: lesson.durationMinutes,
      position: lesson.position,
    });
  }
}
