import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { Account } from '@application/entities/account/Account';
import { File, fileStatuses } from '@application/entities/file/File';
import type { FileStorage } from '@application/gateways/file/FileStorage';
import type { ImageProcessor } from '@application/gateways/file/ImageProcessor';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';
import type { FileRepository } from '@application/repositories/file/FileRepository';

// One object S3 stored in the private bucket (Q378). S3 says it exists; the File
// record says whether it was expected. A conflict or an S3 failure throws, and the
// message comes back: every step can run again.
export class ProcessUploadUseCase {
  constructor(
    private readonly filesRepository: FileRepository,
    private readonly accountsRepository: AccountRepository,
    private readonly fileStorage: FileStorage,
    private readonly imageProcessor: ImageProcessor,
    private readonly unitOfWorkFactory: UnitOfWork.Factory,
  ) {}

  async execute({
    key,
    eTag,
  }: ProcessUploadUseCase.Input): Promise<ProcessUploadUseCase.Outcome> {
    const outcome = await this.process(key, eTag);

    console[outcome === 'processed' ? 'info' : 'warn'](
      JSON.stringify({ event: 'UploadProcessed', key, outcome }),
    );

    return outcome;
  }

  private async process(
    key: string,
    eTag: string,
  ): Promise<ProcessUploadUseCase.Outcome> {
    const reference = File.parseOriginalKey(key);
    const file = reference ? await this.filesRepository.find(reference) : null;

    // Every upload is signed after its record: an object without one is garbage (Q390).
    if (!file) {
      await this.fileStorage.deleteOriginal(key);
      return 'unrecorded';
    }

    // The same policy posted again, or this message again (Q389).
    if (file.status !== fileStatuses.Pending) {
      return 'already-processed';
    }

    const original = await this.fileStorage.readOriginal(key, eTag);

    // Another object took the key; its own event follows.
    if (!original) {
      return 'superseded';
    }

    const image = File.ruleOf(file.purpose).image;

    if (!image) {
      throw new Error(`Uploads for ${file.purpose} are not processed yet.`);
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

    // Stored before the record names them: the account never points at a missing variant.
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

    return this.copyAvatar(file);
  }

  // The copy and the record in one transaction, over the avatar just read (Q85).
  private async copyAvatar(file: File): Promise<ProcessUploadUseCase.Outcome> {
    const account = await this.accountsRepository.findById(
      Account.toId(file.ownerId),
      { consistent: true },
    );

    const previous = account?.avatar;
    // An upload processed after a newer one: file ids are KSUIDs, which sort by time.
    const outdated = previous !== undefined && previous.fileId > file.id;

    if (!account || outdated) {
      await this.fileStorage.deletePublic(Object.values(file.variants ?? {}));
      await this.fileStorage.deleteOriginal(file.originalKey);
      return account ? 'outdated' : 'owner-gone';
    }

    const avatar = { fileId: file.id, variants: file.variants ?? {} };
    const unitOfWork = this.unitOfWorkFactory();
    unitOfWork.add(
      this.filesRepository.markProcessedOperation(file),
      this.accountsRepository.setAvatarOperation(
        account.id,
        avatar,
        previous?.fileId,
      ),
    );

    if (!previous) {
      await unitOfWork.commit();
      return 'processed';
    }

    const replaced = file.sibling(previous.fileId);
    unitOfWork.add(this.filesRepository.deleteOperation(replaced));
    await unitOfWork.commit();

    // After the commit nothing names them; a failure here only leaves cheap garbage (Q381).
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
    | 'rejected'
    | 'already-processed'
    | 'superseded'
    | 'unrecorded'
    | 'outdated'
    | 'owner-gone';
}
