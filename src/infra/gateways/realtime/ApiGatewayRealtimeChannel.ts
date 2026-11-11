import {
  ApiGatewayManagementApiClient,
  DeleteConnectionCommand,
  GoneException,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';

import type { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';
import type { RealtimeChannel } from '@application/gateways/realtime/RealtimeChannel';
import type { AppConfig } from '@shared/config/AppConfig';

export class ApiGatewayRealtimeChannel implements RealtimeChannel {
  private client: ApiGatewayManagementApiClient | undefined;

  constructor(private readonly config: AppConfig) {}

  get apiId(): string {
    return this.config.websocketsApiId;
  }

  async post(
    connectionId: RealtimeConnection.Id,
    message: RealtimeChannel.Message,
  ): Promise<'sent' | 'gone'> {
    const command = new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(message),
    });

    return (await this.reached((client) => client.send(command)))
      ? 'sent'
      : 'gone';
  }

  // The client sees close code 1000; its reconnection then needs a ticket it can no longer get.
  async close(connectionId: RealtimeConnection.Id): Promise<'closed' | 'gone'> {
    const command = new DeleteConnectionCommand({ ConnectionId: connectionId });

    return (await this.reached((client) => client.send(command)))
      ? 'closed'
      : 'gone';
  }

  // false: the client left, or never finished connecting. Any other error says nothing about the
  // client: it is thrown and the connection kept.
  private async reached(
    call: (client: ApiGatewayManagementApiClient) => Promise<unknown>,
  ): Promise<boolean> {
    this.client ??= new ApiGatewayManagementApiClient({
      endpoint: this.config.websocketsApiEndpoint,
    });

    try {
      await call(this.client);

      return true;
    } catch (error) {
      if (error instanceof GoneException) {
        return false;
      }

      throw error;
    }
  }
}
