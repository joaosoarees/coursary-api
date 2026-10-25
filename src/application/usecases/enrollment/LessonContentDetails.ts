import type { LessonRepository } from '@application/repositories/outline/LessonRepository';
import { AttachmentSummary } from '@application/usecases/file/AttachmentSummary';

export class LessonContentDetails {
  readonly lessonId: string;
  readonly courseId: string;
  readonly body: string;
  // The sent material, in the instructor's order (Q406).
  readonly attachments: AttachmentSummary[];

  constructor(attributes: LessonContentDetails) {
    this.lessonId = attributes.lessonId;
    this.courseId = attributes.courseId;
    this.body = attributes.body;
    this.attachments = attributes.attachments;
  }

  static fromContent(content: LessonRepository.Content): LessonContentDetails {
    return new LessonContentDetails({
      lessonId: content.lessonId,
      courseId: content.courseId,
      body: content.body,
      attachments: AttachmentSummary.listOf(content.attachments),
    });
  }
}
