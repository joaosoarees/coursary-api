import { GetMeController } from '@application/controllers/account/GetMeController';
import { GetMeUseCase } from '@application/usecases/account/GetMeUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makePublicAssetUrls } from '@main/factories/makePublicAssetUrls';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const publicAssetUrls = makePublicAssetUrls();
const getMeUseCase = new GetMeUseCase(publicAssetUrls);
const controller = new GetMeController(getMeUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
