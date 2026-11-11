import type { RealtimeConnections } from '@application/gateways/realtime/RealtimeConnections';

export class FakeRealtimeConnections implements RealtimeConnections {
  readonly closed: RealtimeConnections.CloseInput[] = [];

  closeForAccount(input: RealtimeConnections.CloseInput): Promise<void> {
    this.closed.push(input);

    return Promise.resolve();
  }
}
