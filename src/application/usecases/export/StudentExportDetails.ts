import type { StudentExport } from '@application/entities/export/StudentExport';
import type { FileStorage } from '@application/gateways/file/FileStorage';

export class StudentExportDetails {
  readonly id: StudentExport.Id;
  readonly courseId: string;
  readonly status: StudentExport.Status;
  readonly createdAt: string;
  readonly rowCount: number | null;
  readonly downloadUrl?: string;
  readonly expiresIn?: number;

  constructor(attributes: StudentExportDetails) {
    this.id = attributes.id;
    this.courseId = attributes.courseId;
    this.status = attributes.status;
    this.createdAt = attributes.createdAt;
    this.rowCount = attributes.rowCount;
    this.downloadUrl = attributes.downloadUrl;
    this.expiresIn = attributes.expiresIn;
  }

  static fromExport(
    studentExport: StudentExport,
    now: Date,
    download?: FileStorage.SignedDownload,
  ): StudentExportDetails {
    return new StudentExportDetails({
      id: studentExport.id,
      courseId: studentExport.courseId,
      status: studentExport.statusAt(now),
      createdAt: studentExport.createdAt.toISOString(),
      rowCount: studentExport.rowCount ?? null,
      ...(download
        ? { downloadUrl: download.url, expiresIn: download.expiresIn }
        : {}),
    });
  }
}
