import { type File, fileStatuses } from '@application/entities/file/File';

export class AttachmentSummary {
  readonly id: string;
  readonly name: string;
  readonly contentType: string;
  readonly size: number;

  constructor(attributes: AttachmentSummary) {
    this.id = attributes.id;
    this.name = attributes.name;
    this.contentType = attributes.contentType;
    this.size = attributes.size;
  }

  static fromFile(file: File): AttachmentSummary {
    return new AttachmentSummary({
      id: file.id,
      name: file.name ?? file.id,
      contentType: file.contentType,
      size: file.size ?? 0,
    });
  }

  static listOf(files: File[]): AttachmentSummary[] {
    return files
      .filter((file) => file.status === fileStatuses.Uploaded)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((file) => AttachmentSummary.fromFile(file));
  }
}
