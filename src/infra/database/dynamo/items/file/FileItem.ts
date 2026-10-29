import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { File, fileStatuses } from '@application/entities/file/File';
import { Lesson } from '@application/entities/outline/Lesson';
import { AccountItem } from '@infra/database/dynamo/items/account/AccountItem';
import { CourseItem } from '@infra/database/dynamo/items/course/CourseItem';
import { LessonContentItem } from '@infra/database/dynamo/items/outline/LessonContentItem';
import { expiresAtFromNow } from '@infra/database/dynamo/ttl';

// Far past the 5 minutes of the presigned POST and the retries of the uploads queue (Q381).
const FILE_PENDING_TTL_DAYS = 1;

// Past the lifecycle rule that aborts a forgotten multipart upload after a day, so a late
// completion still finds its record (Q436).
const MULTIPART_PENDING_TTL_DAYS = 2;

// In the owner's partition, one per upload (Q53).
export class FileItem {
  static readonly type = 'File';

  private readonly keys: FileItem.Keys;

  constructor(private readonly attributes: FileItem.Attributes) {
    this.keys = {
      PK: FileItem.getPK(attributes),
      SK: FileItem.getSK(attributes),
    };
  }

  toItem(): FileItem.ItemType {
    return { ...this.keys, ...this.attributes, type: FileItem.type };
  }

  static fromEntity(file: File): FileItem {
    return new FileItem({
      id: file.id,
      ownerType: file.ownerType,
      ownerId: file.ownerId,
      purpose: file.purpose,
      status: file.status,
      originalKey: file.originalKey,
      contentType: file.contentType,
      ...(file.size === undefined ? {} : { size: file.size }),
      ...(file.variants ? { variants: file.variants } : {}),
      ...(file.name === undefined ? {} : { name: file.name }),
      ...(file.position === undefined ? {} : { position: file.position }),
      ...(file.uploadId === undefined ? {} : { uploadId: file.uploadId }),
      createdAt: file.createdAt.toISOString(),
      ...(file.status === fileStatuses.Pending
        ? { expiresAt: expiresAtFromNow(FileItem.pendingDaysOf(file)) }
        : {}),
    });
  }

  static toEntity(item: FileItem.ItemType): File {
    return new File({
      id: item.id,
      ownerType: item.ownerType,
      ownerId: item.ownerId,
      purpose: item.purpose,
      status: item.status,
      contentType: item.contentType,
      size: item.size,
      variants: item.variants,
      name: item.name,
      position: item.position,
      uploadId: item.uploadId,
      createdAt: new Date(item.createdAt),
    });
  }

  private static pendingDaysOf(file: File): number {
    return File.ruleOf(file.purpose).partBytes
      ? MULTIPART_PENDING_TTL_DAYS
      : FILE_PENDING_TTL_DAYS;
  }

  // The owner's partition: an avatar beside its account, a cover beside its course,
  // material beside its lesson's content (Q72).
  static getPK({
    ownerType,
    ownerId,
  }: Pick<File.Reference, 'ownerType' | 'ownerId'>): FileItem.Keys['PK'] {
    switch (ownerType) {
      case 'course':
        return CourseItem.getPK(Course.toId(ownerId));
      case 'lesson':
        return LessonContentItem.getPK(Lesson.toId(ownerId));
      case 'account':
        return AccountItem.getPK(Account.toId(ownerId));
    }
  }

  static getSK({
    purpose,
    id,
  }: Pick<File.Reference, 'purpose' | 'id'>): FileItem.Keys['SK'] {
    return `FILE#${purpose}#${id}`;
  }
}

export namespace FileItem {
  export interface Keys {
    PK: `ACCOUNT#${string}` | `COURSE#${string}` | `LESSON#${string}`;
    SK: `FILE#${File.Purpose}#${string}`;
  }

  export interface Attributes {
    id: File.Id;
    ownerType: File.OwnerType;
    ownerId: string;
    purpose: File.Purpose;
    status: File.Status;
    originalKey: string;
    contentType: string;
    size?: number;
    variants?: File.Variants;
    name?: string;
    position?: number;
    uploadId?: string;
    createdAt: string;
    expiresAt?: number;
  }

  export type ItemType = Keys & Attributes & { type: 'File' };
}
