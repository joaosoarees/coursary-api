import { fileStatuses } from '@application/entities/file/File';
import {
  VideoPartsInvalid,
  VideoUploadNotFound,
} from '@application/errors/file';
import type { FileStorage } from '@application/gateways/file/FileStorage';
import type { VideoUploadLookup } from '@application/usecases/file/VideoUploadLookup';

// URLs for a batch of parts, each bound to the length the recorded size gives it (Q434, Q441).
export class SignVideoPartsUseCase {
  constructor(
    private readonly videoUploadLookup: VideoUploadLookup,
    private readonly fileStorage: FileStorage,
  ) {}

  async execute({
    partNumbers,
    ...upload
  }: SignVideoPartsUseCase.Input): Promise<FileStorage.SignedParts> {
    const { file, uploadId } = await this.videoUploadLookup.find(upload);

    if (file.status !== fileStatuses.Pending) {
      throw new VideoUploadNotFound();
    }

    const parts = partNumbers.flatMap((partNumber) => {
      const length = file.partLength(partNumber);

      return length === null ? [] : [{ partNumber, length }];
    });

    if (parts.length !== partNumbers.length) {
      throw new VideoPartsInvalid();
    }

    const toSign = { key: file.originalKey, uploadId, parts };

    return this.fileStorage.signParts(toSign);
  }
}

export namespace SignVideoPartsUseCase {
  export interface Input extends VideoUploadLookup.Input {
    partNumbers: number[];
  }
}
