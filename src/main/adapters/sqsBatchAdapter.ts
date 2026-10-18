import type { SQSBatchResponse, SQSEvent } from 'aws-lambda';
import type { ZodType } from 'zod';

interface UseCase<TInput> {
  execute: (input: TInput) => Promise<unknown>;
}

// For a FIFO queue: after the first failure the rest of the batch goes back too, or a later change would overtake it.
export function sqsBatchAdapter<TInput>(
  schema: ZodType<TInput>,
  useCase: UseCase<TInput>,
) {
  return async (event: SQSEvent): Promise<SQSBatchResponse> => {
    for (const [index, record] of event.Records.entries()) {
      try {
        await useCase.execute(schema.parse(JSON.parse(record.body)));
      } catch (error) {
        console.error(
          JSON.stringify({
            event: 'MessageFailed',
            messageId: record.messageId,
            error: error instanceof Error ? error.message : String(error),
          }),
        );

        return {
          batchItemFailures: event.Records.slice(index).map((failed) => ({
            itemIdentifier: failed.messageId,
          })),
        };
      }
    }

    return { batchItemFailures: [] };
  };
}
