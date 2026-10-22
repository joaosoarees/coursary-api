import { Account } from '@application/entities/account/Account';
import { File } from '@application/entities/file/File';
import type { FileStorage } from '@application/gateways/file/FileStorage';
import type { FileRepository } from '@application/repositories/file/FileRepository';

// The record comes first: every signed POST has a PENDING file waiting for its object (Q378).
export class RequestAvatarUploadUseCase {
  constructor(
    private readonly filesRepository: FileRepository,
    private readonly fileStorage: FileStorage,
  ) {}

  async execute({
    account,
    contentType,
  }: RequestAvatarUploadUseCase.Input): Promise<RequestAvatarUploadUseCase.Output> {
    const { id } = Account.requireActive(account);

    const file = File.create({ ownerId: id, purpose: 'avatar', contentType });
    await this.filesRepository.create(file);

    const { url, fields } = await this.fileStorage.signUpload({
      key: file.originalKey,
      contentType,
      maxBytes: File.ruleOf(file.purpose).maxBytes,
    });

    return { fileId: file.id, url, fields };
  }
}

export namespace RequestAvatarUploadUseCase {
  export interface Input {
    account: Account;
    contentType: string;
  }

  export interface Output {
    fileId: File.Id;
    url: string;
    fields: Record<string, string>;
  }
}
