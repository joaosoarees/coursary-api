import {
  ApiGatewayManagementApiClient,
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

    try {
      this.client ??= new ApiGatewayManagementApiClient({
        endpoint: this.config.websocketsApiEndpoint,
      });
      await this.client.send(command);

      return 'sent';
    } catch (error) {
      // Any other error says nothing about the client: it is thrown and the connection kept.
      if (error instanceof GoneException) {
        return 'gone';
      }

      throw error;
    }
  }
}
