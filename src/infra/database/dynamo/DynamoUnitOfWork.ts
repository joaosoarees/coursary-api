import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import {
  TransactWriteCommand,
  type TransactWriteCommandInput,
} from '@aws-sdk/lib-dynamodb';

import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import { Conflict } from '@application/errors/common';
import { dynamoClient } from '@infra/clients/dynamoClient';

type TransactItem = NonNullable<
  TransactWriteCommandInput['TransactItems']
>[number];

interface DynamoOperation {
  item: TransactItem;
  onConditionFailed: ((stored: unknown) => Error) | undefined;
}

export class DynamoUnitOfWork implements UnitOfWork {
  static readonly maxOperations = 100;

  static readonly maxAttempts = 3;

  private readonly operations: DynamoOperation[] = [];

  add(...operations: UnitOfWork.Operation[]): void {
    this.operations.push(...(operations as unknown as DynamoOperation[]));
  }

  async commit(): Promise<void> {
    if (this.operations.length === 0) {
      return;
    }

    if (this.operations.length > DynamoUnitOfWork.maxOperations) {
      throw new Error(
        `A transaction takes at most ${String(DynamoUnitOfWork.maxOperations)} operations.`,
      );
    }

    const command = new TransactWriteCommand({
      TransactItems: this.operations.map(({ item }) => item),
    });

    for (let attempt = 1; ; attempt++) {
      try {
        await dynamoClient.send(command);

        return;
      } catch (error) {
        if (!(error instanceof TransactionCanceledException)) {
          throw error;
        }

        const reasons = error.CancellationReasons ?? [];
        const failed = reasons.findIndex(
          (reason) => reason.Code === 'ConditionalCheckFailed',
        );

        if (failed >= 0) {
          throw (
            this.operations[failed]?.onConditionFailed?.(
              reasons[failed]?.Item,
            ) ?? new Conflict()
          );
        }

        const conflicted = reasons.some(
          (reason) => reason.Code === 'TransactionConflict',
        );

        if (!conflicted || attempt === DynamoUnitOfWork.maxAttempts) {
          throw conflicted ? new Conflict() : error;
        }

        await DynamoUnitOfWork.wait(attempt);
      }
    }
  }

  static operation(
    item: TransactItem,
    // Gets the stored item when the operation asked for ALL_OLD on failure.
    onConditionFailed?: (stored: unknown) => Error,
  ): UnitOfWork.Operation {
    const operation: DynamoOperation = { item, onConditionFailed };

    return operation as unknown as UnitOfWork.Operation;
  }

  private static wait(attempt: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 25 * 2 ** attempt));
  }
}
