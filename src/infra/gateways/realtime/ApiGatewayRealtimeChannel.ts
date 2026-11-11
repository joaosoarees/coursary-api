import {
  ApiGatewayManagementApiClient,
  GoneException,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';

import type { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';
import type { RealtimeChannel } from '@application/gateways/realtime/RealtimeChannel';
import type { AppConfig } from '@shared/config/AppConfig';

export class ApiGatewayRealtimeChannel implements RealtimeChannel {
  readonly apiId: string;

  private readonly client: ApiGatewayManagementApiClient;

  constructor(config: AppConfig) {
    this.apiId = config.websocketsApiId;
    this.client = new ApiGatewayManagementApiClient({
      endpoint: config.websocketsApiEndpoint,
    });
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
