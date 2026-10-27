import { SendMessageBatchCommand } from '@aws-sdk/client-sqs';

import type { StudentExport } from '@application/entities/export/StudentExport';
import type { StudentExportQueue } from '@application/gateways/export/StudentExportQueue';
import { sqsClient } from '@infra/clients/sqsClient';
import type { AppConfig } from '@shared/config/AppConfig';

// A standard queue: the job reads the export first, so a repeated message writes nothing new.
export class SqsStudentExportQueue implements StudentExportQueue {
  static readonly batchSize = 10;

  constructor(private readonly config: AppConfig) {}

  async enqueue(exportIds: StudentExport.Id[]): Promise<void> {
    for (
      let i = 0;
      i < exportIds.length;
      i += SqsStudentExportQueue.batchSize
    ) {
      const batch = exportIds.slice(i, i + SqsStudentExportQueue.batchSize);
      const command = new SendMessageBatchCommand({
        QueueUrl: this.config.studentExportQueueUrl,
        Entries: batch.map((exportId, index) => ({
          Id: String(index),
          MessageBody: JSON.stringify({ exportId }),
        })),
      });
      const { Failed = [] } = await sqsClient.send(command);

      if (Failed.length > 0) {
        throw new Error(
          `The student export queue refused ${String(Failed.length)} messages: ${Failed.map((f) => f.Code).join(', ')}`,
        );
      }
    }
  }
}
