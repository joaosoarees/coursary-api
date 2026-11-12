import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { z } from 'zod';

import {
  courseIdSchema,
  lessonIdSchema,
} from '@application/controllers/shared/schemas';
import { Account } from '@application/entities/account/Account';
import { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';
import type { OpenRealtimeConnectionUseCase } from '@application/usecases/realtime/OpenRealtimeConnectionUseCase';

interface UseCase<TInput> {
  execute: (input: TInput) => Promise<void>;
}

const connectionIdSchema = z
  .string()
  .min(1)
  .transform((value) => RealtimeConnection.toId(value));

// The authorizer's context arrives flat on requestContext.authorizer.
const connectEventSchema = z.object({
  requestContext: z.object({
    connectionId: connectionIdSchema,
    apiId: z.string().min(1),
    connectedAt: z.number(),
    authorizer: z.object({
      accountId: z
        .string()
        .refine((value) => Account.isId(value))
        .transform((value) => Account.toId(value)),
      courseId: courseIdSchema.optional(),
      lessonId: lessonIdSchema.optional(),
    }),
  }),
});

const disconnectEventSchema = z.object({
  requestContext: z.object({
    connectionId: connectionIdSchema,
    disconnectStatusCode: z.number().optional(),
  }),
});

export function websocketConnectAdapter(
  openConnection: UseCase<OpenRealtimeConnectionUseCase.Input>,
) {
  return async (event: unknown): Promise<APIGatewayProxyResultV2> => {
    const { requestContext } = connectEventSchema.parse(event);
    const { accountId, courseId, lessonId } = requestContext.authorizer;

    // Nothing is posted here: the connection opens only after this returns.
    await openConnection.execute({
      id: requestContext.connectionId,
      apiId: requestContext.apiId,
      accountId,
      // The ticket carries both or neither.
      lesson: courseId && lessonId ? { courseId, lessonId } : undefined,
      connectedAt: new Date(requestContext.connectedAt),
    });

    return { statusCode: 200 };
  };
}

export function websocketDisconnectAdapter(
  closeConnection: UseCase<{ id: RealtimeConnection.Id }>,
) {
  return async (event: unknown): Promise<APIGatewayProxyResultV2> => {
    const { requestContext } = disconnectEventSchema.parse(event);

    console.info({
      connectionId: requestContext.connectionId,
      closeCode: requestContext.disconnectStatusCode,
    });
    await closeConnection.execute({ id: requestContext.connectionId });

    return { statusCode: 200 };
  };
}
