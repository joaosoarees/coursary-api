import { fileStatuses } from '@application/entities/file/File';
import {
  VideoPartsInvalid,
  VideoUploadNotFound,
} from '@application/errors/file';
import type { FileStorage } from '@application/gateways/file/FileStorage';
import type { VideoUploadLookup } from '@application/usecases/file/VideoUploadLookup';

export class CompleteVideoUploadUseCase {
  constructor(
    private readonly videoUploadLookup: VideoUploadLookup,
    private readonly fileStorage: FileStorage,
  ) {}

  async execute({
    parts,
    ...upload
  }: CompleteVideoUploadUseCase.Input): Promise<void> {
    const { file, uploadId } = await this.videoUploadLookup.find(upload);

    // Already confirmed: a retry after a lost answer is told it worked.
    if (file.status === fileStatuses.Uploaded) {
      return;
    }

    if (file.status !== fileStatuses.Pending) {
      throw new VideoUploadNotFound();
    }

    const sorted = parts.toSorted((a, b) => a.partNumber - b.partNumber);

    if (!file.hasEveryPart(sorted.map(({ partNumber }) => partNumber))) {
      throw new VideoPartsInvalid();
    }

    const completion = {
      key: file.originalKey,
      uploadId,
      size: file.size ?? 0,
      parts: sorted,
    };
    const outcome = await this.fileStorage.completeMultipart(completion);

    if (outcome === 'no-upload') {
      throw new VideoUploadNotFound();
    }

    if (outcome === 'invalid-parts') {
      throw new VideoPartsInvalid();
    }
  }
}

export namespace CompleteVideoUploadUseCase {
  export interface Input extends VideoUploadLookup.Input {
    parts: { partNumber: number; eTag: string }[];
  }
}
