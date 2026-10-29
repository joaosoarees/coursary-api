import { defineError } from '@application/errors/shared/defineError';
import { ErrorCode } from '@application/errors/shared/ErrorCode';

export const AttachmentNotFound = defineError(
  'AttachmentNotFound',
  ErrorCode.AttachmentNotFound,
  404,
  'The material does not exist.',
);

export const AttachmentLimit = defineError(
  'AttachmentLimit',
  ErrorCode.AttachmentLimit,
  409,
  'The lesson already holds as much material as it may.',
);

export const AttachmentOrderMismatch = defineError(
  'AttachmentOrderMismatch',
  ErrorCode.AttachmentOrderMismatch,
  400,
  'The order must list every material of the lesson once.',
);

export const VideoUploadNotFound = defineError(
  'VideoUploadNotFound',
  ErrorCode.VideoUploadNotFound,
  404,
  'The lesson has no such video upload in progress.',
);

export const VideoPartsInvalid = defineError(
  'VideoPartsInvalid',
  ErrorCode.VideoPartsInvalid,
  400,
  'The parts must be ones the video has, each sent with the ETag S3 returned.',
);

export const VideoNotFound = defineError(
  'VideoNotFound',
  ErrorCode.VideoNotFound,
  404,
  'The lesson has no video.',
);
