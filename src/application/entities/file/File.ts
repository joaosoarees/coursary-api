import { createHash } from 'node:crypto';

import KSUID from 'ksuid';

import { KSUID_PATTERN } from '@application/entities/shared/ksuid';

export const fileStatuses = {
  Pending: 'PENDING',
  Uploaded: 'UPLOADED',
  Processed: 'PROCESSED',
  Failed: 'FAILED',
} as const;

const MEGABYTE = 1024 * 1024;
const GIGABYTE = 1024 * MEGABYTE;

// What each purpose accepts (Q53, Q379); the presigned POST binds both.
const purposeRules = {
  avatar: {
    ownerType: 'account',
    contentTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 5 * MEGABYTE,
    // Square, cropped to fill (Q380).
    image: {
      fit: 'cover',
      sizes: [
        { name: '64', width: 64, height: 64 },
        { name: '256', width: 256, height: 256 },
      ],
    },
  },
  cover: {
    ownerType: 'course',
    contentTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 10 * MEGABYTE,
    // 16:9 boxes, the whole image without cropping or enlarging (Q380).
    image: {
      fit: 'inside',
      sizes: [
        { name: '480', width: 480, height: 270 },
        { name: '1280', width: 1280, height: 720 },
      ],
    },
  },
  // Lesson material: downloaded as sent, through a presigned URL (Q57, Q379).
  attachment: {
    ownerType: 'lesson',
    contentTypes: [
      'application/pdf',
      'application/zip',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    maxBytes: 50 * MEGABYTE,
    maxPerOwner: 20,
  },
  // One per lesson, sent in parts and watched through a presigned URL (Q433, Q441).
  video: {
    ownerType: 'lesson',
    contentTypes: ['video/mp4'],
    maxBytes: 2 * GIGABYTE,
    partBytes: 16 * MEGABYTE,
  },
} as const satisfies Record<string, File.PurposeRule>;

// <ownerType>/<ownerId>/<purpose>/<fileId>/original, built only by the server (Q77).
const ORIGINAL_KEY =
  /^(account|course|lesson)\/([0-9A-Za-z]{27})\/(avatar|cover|attachment|video)\/([0-9A-Za-z]{27})\/original$/;

// One uploaded file and what was made of it (Q53).
export class File {
  readonly id: File.Id;
  readonly ownerType: File.OwnerType;
  readonly ownerId: string;
  readonly purpose: File.Purpose;
  status: File.Status;
  readonly contentType: string;
  size: number | undefined;
  variants: File.Variants | undefined;
  // The name the uploader gave, for display and the download (Q408).
  readonly name: string | undefined;
  position: number | undefined;
  // The multipart upload that sends it, opened before the record (Q446).
  uploadId: string | undefined;
  readonly createdAt: Date;

  constructor(attributes: File.Attributes) {
    this.id = attributes.id;
    this.ownerType = attributes.ownerType;
    this.ownerId = attributes.ownerId;
    this.purpose = attributes.purpose;
    this.status = attributes.status;
    this.contentType = attributes.contentType;
    this.size = attributes.size;
    this.variants = attributes.variants;
    this.name = attributes.name;
    this.position = attributes.position;
    this.uploadId = attributes.uploadId;
    this.createdAt = attributes.createdAt;
  }

  get originalKey(): string {
    return File.originalKeyOf(this);
  }

  // The size of every part but the last; S3 refuses a middle one under 5 MiB.
  get partBytes(): number {
    const { partBytes } = File.ruleOf(this.purpose);

    if (!partBytes) {
      throw new Error(`A ${this.purpose} is not sent in parts.`);
    }

    return partBytes;
  }

  get partCount(): number {
    return Math.ceil((this.size ?? 0) / this.partBytes);
  }

  // The exact length of one part, which its URL signs; null for a part the file does not have.
  partLength(partNumber: number): number | null {
    if (
      !Number.isInteger(partNumber) ||
      partNumber < 1 ||
      partNumber > this.partCount
    ) {
      return null;
    }

    const start = (partNumber - 1) * this.partBytes;

    return Math.min(this.partBytes, (this.size ?? 0) - start);
  }

  // S3 joins exactly the parts it is given: the list must name each one, in order, once.
  hasEveryPart(partNumbers: number[]): boolean {
    return (
      partNumbers.length === this.partCount &&
      partNumbers.every((partNumber, index) => partNumber === index + 1)
    );
  }

  // Another file of the same owner and purpose, such as the one this replaces.
  sibling(id: File.Id): File.Reference {
    return {
      ownerType: this.ownerType,
      ownerId: this.ownerId,
      purpose: this.purpose,
      id,
    };
  }

  process({ size, variants }: { size: number; variants: File.Variants }): void {
    this.status = fileStatuses.Processed;
    this.size = size;
    this.variants = variants;
  }

  // A file kept as sent: S3 stored it, nothing is made of it (Q409).
  markUploaded(size: number): void {
    this.status = fileStatuses.Uploaded;
    this.size = size;
  }

  fail(size: number): void {
    this.status = fileStatuses.Failed;
    this.size = size;
  }

  static isId(value: unknown): value is File.Id {
    return typeof value === 'string' && KSUID_PATTERN.test(value);
  }

  // The one a single-file owner shows: the newest sent, as ids are KSUIDs (Q445, Q451).
  static currentOf(files: File[]): File | undefined {
    return files
      .filter((file) => file.status === fileStatuses.Uploaded)
      .reduce<File | undefined>(
        (newest, file) => (newest && newest.id > file.id ? newest : file),
        undefined,
      );
  }

  static ruleOf(purpose: File.Purpose): File.PurposeRule {
    return purposeRules[purpose];
  }

  // Named by its content, so the CDN may cache it for good (Q69, Q380).
  static variantKeyOf(
    file: Pick<File, 'ownerType' | 'ownerId' | 'purpose' | 'id'>,
    name: string,
    bytes: Uint8Array,
  ): string {
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);

    return `${file.ownerType}/${file.ownerId}/${file.purpose}/${file.id}/${name}-${hash}.webp`;
  }

  static originalKeyOf(
    file: Pick<File, 'ownerType' | 'ownerId' | 'purpose' | 'id'>,
  ): string {
    return `${file.ownerType}/${file.ownerId}/${file.purpose}/${file.id}/original`;
  }

  // Everything an owner holds in either bucket: originals and variants.
  static ownerPrefixOf(owner: File.Owner): string {
    return `${owner.ownerType}/${owner.ownerId}/`;
  }

  // Null for any key the server would not have built.
  static parseOriginalKey(key: string): File.Reference | null {
    const match = ORIGINAL_KEY.exec(key);

    if (!match) {
      return null;
    }

    const [, ownerType, ownerId = '', purpose, id] = match;

    // Each purpose belongs to one kind of owner: an avatar is never a course's.
    if (purposeRules[purpose as File.Purpose].ownerType !== ownerType) {
      return null;
    }

    return {
      ownerType,
      ownerId,
      purpose: purpose as File.Purpose,
      id: id as File.Id,
    };
  }

  static create({
    ownerId,
    purpose,
    contentType,
    name,
    position,
    size,
  }: {
    ownerId: string;
    purpose: File.Purpose;
    contentType: string;
    name?: string;
    position?: number;
    // Declared at the start of a multipart upload; the others learn it from S3.
    size?: number;
  }): File {
    return new File({
      id: KSUID.randomSync().string as File.Id,
      ownerType: purposeRules[purpose].ownerType,
      ownerId,
      purpose,
      status: fileStatuses.Pending,
      contentType,
      size,
      variants: undefined,
      name,
      position,
      createdAt: new Date(),
    });
  }
}

export namespace File {
  export type Id = string & { readonly __brand: 'File.Id' };

  export type Purpose = keyof typeof purposeRules;

  export type OwnerType = (typeof purposeRules)[Purpose]['ownerType'];

  export type Owner = Pick<Reference, 'ownerType' | 'ownerId'>;

  // The purposes whose upload becomes webp variants copied into the owner.
  export type ImagePurpose = {
    [P in Purpose]: (typeof purposeRules)[P] extends { image: unknown }
      ? P
      : never;
  }[Purpose];

  export type Status = (typeof fileStatuses)[keyof typeof fileStatuses];

  // Variant name (a width) → key in the public bucket.
  export type Variants = Record<string, string>;

  // What the owner keeps of its current image: the avatar, the cover (Q85).
  export interface Copy {
    fileId: Id;
    variants: Variants;
  }

  export interface PurposeRule {
    ownerType: string;
    contentTypes: readonly string[];
    maxBytes: number;
    // Only for images: the webp variants made of each upload.
    image?: ImageRule;
    // How many one owner may hold at once (Q408).
    maxPerOwner?: number;
    // Only for multipart uploads: the size of every part but the last (Q441).
    partBytes?: number;
  }

  export interface ImageRule {
    fit: 'cover' | 'inside';
    sizes: readonly { name: string; width: number; height: number }[];
  }

  export interface Reference {
    ownerType: OwnerType;
    ownerId: string;
    purpose: Purpose;
    id: Id;
  }

  export interface Attributes extends Reference {
    status: Status;
    contentType: string;
    size: number | undefined;
    variants: Variants | undefined;
    name?: string;
    position?: number;
    uploadId?: string;
    createdAt: Date;
  }
}
