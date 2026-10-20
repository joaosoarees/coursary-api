import { GetMeController } from '@application/controllers/account/GetMeController';
import { GetMeUseCase } from '@application/usecases/account/GetMeUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const getMeUseCase = new GetMeUseCase();
const controller = new GetMeController(getMeUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
