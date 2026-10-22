import KSUID from 'ksuid';

import { KSUID_PATTERN } from '@application/entities/shared/ksuid';

export const fileStatuses = {
  Pending: 'PENDING',
  Uploaded: 'UPLOADED',
  Processed: 'PROCESSED',
  Failed: 'FAILED',
} as const;

const MEGABYTE = 1024 * 1024;

// What each purpose accepts (Q53, Q379); the presigned POST binds both.
const purposeRules = {
  avatar: {
    ownerType: 'account',
    contentTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 5 * MEGABYTE,
  },
} as const satisfies Record<string, File.PurposeRule>;

// <ownerType>/<ownerId>/<purpose>/<fileId>/original, built only by the server (Q77).
const ORIGINAL_KEY =
  /^(account)\/([0-9A-Za-z]{27})\/(avatar)\/([0-9A-Za-z]{27})\/original$/;

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
    this.createdAt = attributes.createdAt;
  }

  get originalKey(): string {
    return File.originalKeyOf(this);
  }

  process({ size, variants }: { size: number; variants: File.Variants }): void {
    this.status = fileStatuses.Processed;
    this.size = size;
    this.variants = variants;
  }

  fail(size: number): void {
    this.status = fileStatuses.Failed;
    this.size = size;
  }

  static isId(value: unknown): value is File.Id {
    return typeof value === 'string' && KSUID_PATTERN.test(value);
  }

  static ruleOf(purpose: File.Purpose): File.PurposeRule {
    return purposeRules[purpose];
  }

  static originalKeyOf(
    file: Pick<File, 'ownerType' | 'ownerId' | 'purpose' | 'id'>,
  ): string {
    return `${file.ownerType}/${file.ownerId}/${file.purpose}/${file.id}/original`;
  }

  // Null for any key the server would not have built.
  static parseOriginalKey(key: string): File.Reference | null {
    const match = ORIGINAL_KEY.exec(key);

    if (!match) {
      return null;
    }

    const [, ownerType, ownerId = '', purpose, id] = match;

    return {
      ownerType: ownerType as File.OwnerType,
      ownerId,
      purpose: purpose as File.Purpose,
      id: id as File.Id,
    };
  }

  static create({
    ownerId,
    purpose,
    contentType,
  }: {
    ownerId: string;
    purpose: File.Purpose;
    contentType: string;
  }): File {
    return new File({
      id: KSUID.randomSync().string as File.Id,
      ownerType: purposeRules[purpose].ownerType,
      ownerId,
      purpose,
      status: fileStatuses.Pending,
      contentType,
      size: undefined,
      variants: undefined,
      createdAt: new Date(),
    });
  }
}

export namespace File {
  export type Id = string & { readonly __brand: 'File.Id' };

  export type Purpose = keyof typeof purposeRules;

  export type OwnerType = (typeof purposeRules)[Purpose]['ownerType'];

  export type Status = (typeof fileStatuses)[keyof typeof fileStatuses];

  // Variant name (a width) → key in the public bucket.
  export type Variants = Record<string, string>;

  export interface PurposeRule {
    ownerType: string;
    contentTypes: readonly string[];
    maxBytes: number;
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
    createdAt: Date;
  }
}
