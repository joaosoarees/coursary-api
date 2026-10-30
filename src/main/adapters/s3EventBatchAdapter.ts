import type { SQSBatchResponse, SQSEvent } from 'aws-lambda';
import { z } from 'zod';

interface UseCase {
  execute: (input: { key: string; eTag: string }) => Promise<unknown>;
}

// What S3 sends to the queue: the test event when the notification is saved, or records.
const messageSchema = z.union([
  z.object({ Event: z.literal('s3:TestEvent') }),
  z.object({
    Records: z.array(
      z.object({
        eventName: z.string(),
        s3: z.object({
          bucket: z.object({ name: z.string() }),
          object: z.object({ key: z.string(), eTag: z.string() }),
        }),
      }),
    ),
  }),
]);

// S3 notifications through SQS: each message is retried alone, with every record in it.
export function s3EventBatchAdapter(bucket: () => string, useCase: UseCase) {
  return async (event: SQSEvent): Promise<SQSBatchResponse> => {
    const failed: string[] = [];

    for (const record of event.Records) {
      try {
        const message = messageSchema.parse(JSON.parse(record.body));

        if (!('Records' in message)) {
          console.info(JSON.stringify({ event: 'S3TestEvent' }));
          continue;
        }

        for (const { eventName, s3 } of message.Records) {
          if (
            s3.bucket.name !== bucket() ||
            !eventName.startsWith('ObjectCreated:')
          ) {
            console.warn(
              JSON.stringify({
                event: 'S3EventIgnored',
                bucket: s3.bucket.name,
                eventName,
              }),
            );
            continue;
          }

          // Keys arrive form-encoded: a space is `+`.
          const key = decodeURIComponent(s3.object.key.replace(/\+/g, ' '));
          await useCase.execute({ key, eTag: s3.object.eTag });
        }
      } catch (error) {
        console.error(
          JSON.stringify({
            event: 'MessageFailed',
            messageId: record.messageId,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
        failed.push(record.messageId);
      }
    }

    return {
      batchItemFailures: failed.map((itemIdentifier) => ({ itemIdentifier })),
    };
  };
}
