import type { Account } from '@application/entities/account/Account';
import type { File } from '@application/entities/file/File';
import { FileNotFound } from '@application/errors/file';
import type { FileRepository } from '@application/repositories/file/FileRepository';

// Keyed by the caller's id: another account's file is not found, not forbidden.
export class GetAvatarUploadUseCase {
  constructor(private readonly filesRepository: FileRepository) {}

  async execute({
    callerId,
    fileId,
  }: GetAvatarUploadUseCase.Input): Promise<GetAvatarUploadUseCase.Output> {
    const file = await this.filesRepository.find({
      ownerType: 'account',
      ownerId: callerId,
      purpose: 'avatar',
      id: fileId,
    });

    if (!file) {
      throw new FileNotFound();
    }

    return { status: file.status };
  }
}

export namespace GetAvatarUploadUseCase {
  export interface Input {
    callerId: Account.Id;
    fileId: File.Id;
  }

  export interface Output {
    status: File.Status;
  }
}
