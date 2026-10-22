import { RequestAvatarUploadController } from '@application/controllers/account/RequestAvatarUploadController';
import { RequestAvatarUploadUseCase } from '@application/usecases/file/RequestAvatarUploadUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeFileRepository } from '@main/factories/makeFileRepository';
import { makeFileStorage } from '@main/factories/makeFileStorage';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const filesRepository = makeFileRepository();
const fileStorage = makeFileStorage();
const requestAvatarUploadUseCase = new RequestAvatarUploadUseCase(
  filesRepository,
  fileStorage,
);
const controller = new RequestAvatarUploadController(
  requestAvatarUploadUseCase,
);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
