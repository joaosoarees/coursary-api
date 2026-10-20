import type { LessonRepository } from '@application/repositories/outline/LessonRepository';

export class LessonContentDetails {
  readonly lessonId: string;
  readonly courseId: string;
  readonly body: string;

  constructor(attributes: LessonContentDetails) {
    this.lessonId = attributes.lessonId;
    this.courseId = attributes.courseId;
    this.body = attributes.body;
  }

  static fromContent(content: LessonRepository.Content): LessonContentDetails {
    return new LessonContentDetails({
      lessonId: content.lessonId,
      courseId: content.courseId,
      body: content.body,
    });
  }
}
