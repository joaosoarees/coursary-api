import type { FileStorage } from '@application/gateways/file/FileStorage';
import type { LessonRepository } from '@application/repositories/outline/LessonRepository';
import { AttachmentSummary } from '@application/usecases/file/AttachmentSummary';

export class LessonContentDetails {
  readonly lessonId: string;
  readonly courseId: string;
  readonly body: string;
  readonly attachments: AttachmentSummary[];
  readonly video?: FileStorage.SignedDownload;

  constructor(attributes: LessonContentDetails) {
    this.lessonId = attributes.lessonId;
    this.courseId = attributes.courseId;
    this.body = attributes.body;
    this.attachments = attributes.attachments;
    this.video = attributes.video;
  }

  static fromContent(
    content: LessonRepository.Content,
    video?: FileStorage.SignedDownload,
  ): LessonContentDetails {
    return new LessonContentDetails({
      lessonId: content.lessonId,
      courseId: content.courseId,
      body: content.body,
      attachments: AttachmentSummary.listOf(content.attachments),
      video,
    });
  }
}
