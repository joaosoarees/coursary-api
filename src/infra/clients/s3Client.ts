import { S3Client } from '@aws-sdk/client-s3';

// Checksums only where S3 requires one: by default a presigned UploadPart carries the CRC32
// of an empty body, and S3 refuses the part the browser sends with it.
export const s3Client = new S3Client({
  requestChecksumCalculation: 'WHEN_REQUIRED',
});
