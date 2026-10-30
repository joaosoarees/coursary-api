import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import { StudentExport } from '@application/entities/export/StudentExport';
import { expiresAtFromNow } from '@infra/database/dynamo/ttl';

// As long as the lifecycle rule keeps the file.
const EXPORT_TTL_DAYS = 7;

// Its own partition: read by id, never listed.
export class StudentExportItem {
  static readonly type = 'StudentExport';

  private readonly keys: StudentExportItem.Keys;

  constructor(private readonly attributes: StudentExportItem.Attributes) {
    this.keys = {
      PK: StudentExportItem.getPK(attributes.id),
      SK: StudentExportItem.getSK(attributes.id),
    };
  }

  toItem(): StudentExportItem.ItemType {
    return { ...this.keys, ...this.attributes, type: StudentExportItem.type };
  }

  static fromEntity(studentExport: StudentExport): StudentExportItem {
    return new StudentExportItem({
      id: studentExport.id,
      courseId: studentExport.courseId,
      requestedBy: studentExport.requestedBy,
      status: studentExport.status,
      fileKey: studentExport.fileKey,
      ...(studentExport.rowCount === undefined
        ? {}
        : { rowCount: studentExport.rowCount }),
      createdAt: studentExport.createdAt.toISOString(),
      expiresAt: expiresAtFromNow(
        EXPORT_TTL_DAYS,
        studentExport.createdAt.getTime(),
      ),
    });
  }

  static toEntity(item: StudentExportItem.ItemType): StudentExport {
    return new StudentExport({
      id: item.id,
      courseId: item.courseId,
      requestedBy: item.requestedBy,
      status: item.status,
      rowCount: item.rowCount,
      createdAt: new Date(item.createdAt),
    });
  }

  static getPK(id: StudentExport.Id): StudentExportItem.Keys['PK'] {
    return `EXPORT#${id}`;
  }

  static getSK(id: StudentExport.Id): StudentExportItem.Keys['SK'] {
    return `EXPORT#${id}`;
  }
}

export namespace StudentExportItem {
  export interface Keys {
    PK: `EXPORT#${string}`;
    SK: `EXPORT#${string}`;
  }

  export interface Attributes {
    id: StudentExport.Id;
    courseId: Course.Id;
    requestedBy: Account.Id;
    status: StudentExport.Status;
    fileKey: string;
    rowCount?: number;
    createdAt: string;
    expiresAt: number;
  }

  export type ItemType = Keys & Attributes & { type: 'StudentExport' };
}
