import { fileStatuses } from '@application/entities/file/File';
import { VideoUploadNotFound } from '@application/errors/file';
import type { FileStorage } from '@application/gateways/file/FileStorage';
import type { FileRepository } from '@application/repositories/file/FileRepository';
import type { VideoUploadLookup } from '@application/usecases/file/VideoUploadLookup';

// The parts go first, so a failure leaves the record for the route to be called again.
export class AbortVideoUploadUseCase {
  constructor(
    private readonly videoUploadLookup: VideoUploadLookup,
    private readonly filesRepository: FileRepository,
    private readonly fileStorage: FileStorage,
  ) {}

  async execute(input: AbortVideoUploadUseCase.Input): Promise<void> {
    const { file, uploadId } = await this.videoUploadLookup.find(input);

    if (file.status !== fileStatuses.Pending) {
      throw new VideoUploadNotFound();
    }

    const upload = { key: file.originalKey, uploadId };
    await this.fileStorage.abortMultipart(upload);
    await this.filesRepository.delete(file);
  }
}

export namespace AbortVideoUploadUseCase {
  export type Input = VideoUploadLookup.Input;
}
