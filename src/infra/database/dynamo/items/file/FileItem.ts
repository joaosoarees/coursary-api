import { Account } from '@application/entities/account/Account';
import { File, fileStatuses } from '@application/entities/file/File';
import { AccountItem } from '@infra/database/dynamo/items/account/AccountItem';
import { expiresAtFromNow } from '@infra/database/dynamo/ttl';

// Far past the 5 minutes of the presigned POST and the retries of the uploads queue (Q381).
const FILE_PENDING_TTL_DAYS = 1;

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
      createdAt: file.createdAt.toISOString(),
      ...(file.status === fileStatuses.Pending
        ? { expiresAt: expiresAtFromNow(FILE_PENDING_TTL_DAYS) }
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
      createdAt: new Date(item.createdAt),
    });
  }

  // The owner's partition; only accounts own files so far.
  static getPK({
    ownerId,
  }: Pick<File.Reference, 'ownerType' | 'ownerId'>): FileItem.Keys['PK'] {
    return AccountItem.getPK(Account.toId(ownerId));
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
    PK: `ACCOUNT#${string}`;
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
    createdAt: string;
    expiresAt?: number;
  }

  export type ItemType = Keys & Attributes & { type: 'File' };
}
