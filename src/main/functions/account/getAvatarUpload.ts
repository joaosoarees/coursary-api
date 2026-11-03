import { GetAvatarUploadController } from '@application/controllers/account/GetAvatarUploadController';
import { GetAvatarUploadUseCase } from '@application/usecases/file/GetAvatarUploadUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeFileRepository } from '@main/factories/makeFileRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const getAvatarUploadUseCase = new GetAvatarUploadUseCase(makeFileRepository());
const controller = new GetAvatarUploadController(getAvatarUploadUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
