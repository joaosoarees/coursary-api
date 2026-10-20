import { Controller } from '@application/contracts/Controller';

export class HealthController extends Controller<'public', { status: 'ok' }> {
  protected handle() {
    return Promise.resolve({
      statusCode: 200,
      body: { status: 'ok' as const },
    });
  }
}
