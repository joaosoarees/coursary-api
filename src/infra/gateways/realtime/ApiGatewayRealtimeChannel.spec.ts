import {
  ApiGatewayManagementApiClient,
  DeleteConnectionCommand,
  ForbiddenException,
  GoneException,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Lesson } from '@application/entities/outline/Lesson';
import { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';
import { ApiGatewayRealtimeChannel } from '@infra/gateways/realtime/ApiGatewayRealtimeChannel';
import { AppConfig } from '@shared/config/AppConfig';

const connectionId = RealtimeConnection.toId('L0SM9cOFvHcCIhw=');
const message = {
  type: 'questions' as const,
  lessonId: Lesson.toId('2HZXtsyCWqKbYadQSGc1G5hSJPo'),
};
const awsError = <T>(Type: new (options: never) => T) =>
  new Type({ message: 'refused', $metadata: {} } as never);

beforeEach(() => {
  vi.stubEnv(
    'WEBSOCKETS_API_ENDPOINT',
    'https://abc123def4.execute-api.sa-east-1.amazonaws.com/dev',
  );
  vi.stubEnv('WEBSOCKETS_API_ID', 'abc123def4');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('ApiGatewayRealtimeChannel', () => {
  it('should post the message as JSON to the connection', async () => {
    const send = vi
      .spyOn(ApiGatewayManagementApiClient.prototype, 'send')
      .mockResolvedValue({} as never);
    const channel = new ApiGatewayRealtimeChannel(new AppConfig());

    await expect(channel.post(connectionId, message)).resolves.toBe('sent');
    expect(channel.apiId).toBe('abc123def4');
    const [command] = send.mock.calls[0] ?? [];
    expect(command).toBeInstanceOf(PostToConnectionCommand);
    expect((command as PostToConnectionCommand).input).toEqual({
      ConnectionId: connectionId,
      Data: JSON.stringify(message),
    });
  });

  it('should tell a gone client apart from any other refusal', async () => {
    const send = vi.spyOn(ApiGatewayManagementApiClient.prototype, 'send');
    const channel = new ApiGatewayRealtimeChannel(new AppConfig());

    send.mockRejectedValueOnce(awsError(GoneException));
    await expect(channel.post(connectionId, message)).resolves.toBe('gone');

    send.mockRejectedValueOnce(awsError(ForbiddenException));
    await expect(channel.post(connectionId, message)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('should close a connection, and take one already gone quietly', async () => {
    const send = vi
      .spyOn(ApiGatewayManagementApiClient.prototype, 'send')
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(awsError(GoneException));
    const channel = new ApiGatewayRealtimeChannel(new AppConfig());

    await expect(channel.close(connectionId)).resolves.toBe('closed');
    await expect(channel.close(connectionId)).resolves.toBe('gone');
    const [command] = send.mock.calls[0] ?? [];
    expect(command).toBeInstanceOf(DeleteConnectionCommand);
    expect((command as DeleteConnectionCommand).input).toEqual({
      ConnectionId: connectionId,
    });
  });
});
