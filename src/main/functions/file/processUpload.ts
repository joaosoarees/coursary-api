import { AccountAvatarOwner } from '@application/usecases/file/AccountAvatarOwner';
import { CourseCoverOwner } from '@application/usecases/file/CourseCoverOwner';
import { ProcessUploadUseCase } from '@application/usecases/file/ProcessUploadUseCase';
import { s3EventBatchAdapter } from '@main/adapters/s3EventBatchAdapter';
import { makeAccountRepository } from '@main/factories/makeAccountRepository';
import { makeAppConfig } from '@main/factories/makeAppConfig';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeFileRepository } from '@main/factories/makeFileRepository';
import { makeFileStorage } from '@main/factories/makeFileStorage';
import { makeImageProcessor } from '@main/factories/makeImageProcessor';
import { makeUnitOfWork } from '@main/factories/makeUnitOfWork';

const appConfig = makeAppConfig();
const filesRepository = makeFileRepository();
const owners = {
  avatar: new AccountAvatarOwner(makeAccountRepository()),
  cover: new CourseCoverOwner(makeCourseRepository()),
};
const fileStorage = makeFileStorage();
const imageProcessor = makeImageProcessor();
const processUploadUseCase = new ProcessUploadUseCase(
  filesRepository,
  owners,
  fileStorage,
  imageProcessor,
  makeUnitOfWork,
);

export const handler = s3EventBatchAdapter(
  () => appConfig.privateFilesBucket,
  processUploadUseCase,
);
