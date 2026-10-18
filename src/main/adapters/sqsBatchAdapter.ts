import type { SQSBatchResponse, SQSEvent } from 'aws-lambda';
import type { ZodType } from 'zod';

interface UseCase<TInput> {
  execute: (input: TInput) => Promise<unknown>;
}

// Ordered (a FIFO queue): after the first failure the rest of the batch goes
// back too, or a later change would overtake it. Otherwise only the failed ones go back.
export function sqsBatchAdapter<TInput>(
  schema: ZodType<TInput>,
  useCase: UseCase<TInput>,
  { ordered }: { ordered: boolean },
) {
  return async (event: SQSEvent): Promise<SQSBatchResponse> => {
    const failed: string[] = [];

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

        if (ordered) {
          failed.push(...event.Records.slice(index).map((r) => r.messageId));
          break;
        }

        failed.push(record.messageId);
      }
    }

    return {
      batchItemFailures: failed.map((itemIdentifier) => ({ itemIdentifier })),
    };
  };
}
