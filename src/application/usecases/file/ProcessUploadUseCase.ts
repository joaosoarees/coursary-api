import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { File, fileStatuses } from '@application/entities/file/File';
import type { FileStorage } from '@application/gateways/file/FileStorage';
import type { ImageProcessor } from '@application/gateways/file/ImageProcessor';
import type { FileRepository } from '@application/repositories/file/FileRepository';
import type { FileOwner } from '@application/usecases/file/FileOwner';

// One object S3 stored in the private bucket. S3 says it exists; the File
// record says whether it was expected. A conflict or an S3 failure throws, and the
// message comes back: every step can run again.
export class ProcessUploadUseCase {
  constructor(
    private readonly filesRepository: FileRepository,
    private readonly owners: FileOwner.ByPurpose,
    private readonly fileStorage: FileStorage,
    private readonly imageProcessor: ImageProcessor,
    private readonly unitOfWorkFactory: UnitOfWork.Factory,
  ) {}

  async execute({
    key,
    eTag,
  }: ProcessUploadUseCase.Input): Promise<ProcessUploadUseCase.Outcome> {
    const outcome = await this.process(key, eTag);

    console[
      outcome === 'processed' || outcome === 'uploaded' ? 'info' : 'warn'
    ](JSON.stringify({ event: 'UploadProcessed', key, outcome }));

    return outcome;
  }

  private async process(
    key: string,
    eTag: string,
  ): Promise<ProcessUploadUseCase.Outcome> {
    const reference = File.parseOriginalKey(key);
    const file = reference ? await this.filesRepository.find(reference) : null;

    // Every upload is signed after its record: an object without one is garbage.
    if (!file) {
      await this.fileStorage.deleteOriginal(key);
      return 'unrecorded';
    }

    // The same policy posted again, or this message again.
    if (file.status !== fileStatuses.Pending) {
      return 'already-processed';
    }

    const image = File.ruleOf(file.purpose).image;

    // Kept as sent: S3 enforced the type and the size, nothing is made of it.
    if (!image) {
      const size = await this.fileStorage.statOriginal(key, eTag);

      // Another object took the key; its own event follows.
      if (size === null) {
        return 'superseded';
      }

      file.markUploaded(size);

      return file.purpose === 'video'
        ? this.replaceVideo(file)
        : this.confirm(file);
    }

    const original = await this.fileStorage.readOriginal(key, eTag);

    if (!original) {
      return 'superseded';
    }

    const result = await this.imageProcessor.makeVariants({
      bytes: original.bytes,
      contentType: file.contentType,
      fit: image.fit,
      sizes: image.sizes,
    });

    if ('rejected' in result) {
      file.fail(original.size);
      await this.filesRepository.markFailed(file);
      await this.fileStorage.deleteOriginal(key);
      console.warn(
        JSON.stringify({
          event: 'UploadRejected',
          key,
          reason: result.rejected,
        }),
      );

      return 'rejected';
    }

    // Stored before the record names them: the owner never points at a missing variant.
    const variants: File.Variants = {};
    await Promise.all(
      result.variants.map(async ({ name, bytes }) => {
        const variantKey = File.variantKeyOf(file, name, bytes);
        variants[name] = variantKey;
        await this.fileStorage.putPublic({
          key: variantKey,
          bytes,
          contentType: 'image/webp',
        });
      }),
    );
    file.process({ size: original.size, variants });

    return this.copyToOwner(file);
  }

  private async confirm(file: File): Promise<ProcessUploadUseCase.Outcome> {
    await this.filesRepository.markUploaded(file);

    return 'uploaded';
  }

  // One video per lesson, with no copy in the owner: the newest sent wins. Ids are
  // KSUIDs, which sort by time; a failure midway only leaves an older video behind.
  private async replaceVideo(
    file: File,
  ): Promise<ProcessUploadUseCase.Outcome> {
    const videos = await this.filesRepository.listByOwner(file, 'video');
    const others = videos.filter(
      (video) => video.id !== file.id && video.status === fileStatuses.Uploaded,
    );

    if (others.some((video) => video.id > file.id)) {
      await this.discard(file);
      return 'outdated';
    }

    await this.filesRepository.markUploaded(file);
    await Promise.all(others.map((video) => this.discard(video)));

    return 'uploaded';
  }

  // The record first: an object left behind is only an unnamed file.
  private async discard(file: File): Promise<void> {
    await this.filesRepository.delete(file);
    await this.fileStorage.deleteOriginal(file.originalKey);
  }

  // The copy and the record in one transaction, over the copy just read.
  private async copyToOwner(file: File): Promise<ProcessUploadUseCase.Outcome> {
    // Only image purposes reach here: the others are confirmed as sent above.
    const owner = this.owners[file.purpose as File.ImagePurpose];
    const current = await owner.readCopy(file.ownerId);

    const previous = current?.copy;
    // An upload processed after a newer one: file ids are KSUIDs, which sort by time.
    const outdated = previous !== undefined && previous.fileId > file.id;

    if (!current || outdated) {
      await this.fileStorage.deletePublic(Object.values(file.variants ?? {}));
      await this.fileStorage.deleteOriginal(file.originalKey);
      return current ? 'outdated' : 'owner-gone';
    }

    const copy = { fileId: file.id, variants: file.variants ?? {} };
    const unitOfWork = this.unitOfWorkFactory();
    unitOfWork.add(
      this.filesRepository.markProcessedOperation(file),
      owner.setCopyOperation(file.ownerId, copy, previous?.fileId),
    );

    if (!previous) {
      await unitOfWork.commit();
      return 'processed';
    }

    const replaced = file.sibling(previous.fileId);
    unitOfWork.add(this.filesRepository.deleteOperation(replaced));
    await unitOfWork.commit();

    // After the commit nothing names them; a failure here only leaves cheap garbage.
    await this.fileStorage.deletePublic(Object.values(previous.variants));
    await this.fileStorage.deleteOriginal(File.originalKeyOf(replaced));

    return 'processed';
  }
}

export namespace ProcessUploadUseCase {
  export interface Input {
    key: string;
    // As S3 sends it in the event, without quotes.
    eTag: string;
  }

  export type Outcome =
    | 'processed'
    | 'uploaded'
    | 'rejected'
    | 'already-processed'
    | 'superseded'
    | 'unrecorded'
    | 'outdated'
    | 'owner-gone';
}
