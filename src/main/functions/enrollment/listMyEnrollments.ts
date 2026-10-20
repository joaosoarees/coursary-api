import { ListMyEnrollmentsController } from '@application/controllers/enrollment/ListMyEnrollmentsController';
import { ListMyEnrollmentsUseCase } from '@application/usecases/enrollment/ListMyEnrollmentsUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeListMyEnrollmentsQuery } from '@main/factories/makeListMyEnrollmentsQuery';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const listMyEnrollmentsQuery = makeListMyEnrollmentsQuery();
const listMyEnrollmentsUseCase = new ListMyEnrollmentsUseCase(
  listMyEnrollmentsQuery,
);
const controller = new ListMyEnrollmentsController(listMyEnrollmentsUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
