import { HealthController } from '@application/controllers/health/HealthController';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = new HealthController();

export const handler = lambdaHttpAdapter(controller);
