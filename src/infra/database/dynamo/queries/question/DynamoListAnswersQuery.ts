import { z } from 'zod';

import type { Page } from '@application/contracts/Page';
import type { Answer } from '@application/entities/question/Answer';
import type { ListAnswersQuery } from '@application/queries/question/ListAnswersQuery';
import { DynamoPagination } from '@infra/database/dynamo/DynamoPagination';
import { AnswerItem } from '@infra/database/dynamo/items/question/AnswerItem';
import type { AppConfig } from '@shared/config/AppConfig';

// Oldest first, as a conversation reads.
export class DynamoListAnswersQuery implements ListAnswersQuery {
  constructor(private readonly config: AppConfig) {}

  async execute({
    lessonId,
    questionId,
    page,
  }: ListAnswersQuery.Input): Promise<Page<Answer>> {
    const PK = AnswerItem.getPK(lessonId);
    const prefix = AnswerItem.prefixOf(questionId);
    const pagination = new DynamoPagination(
      z.strictObject({ PK: z.literal(PK), SK: z.string().startsWith(prefix) }),
    );

    const { items, nextCursor } =
      await pagination.queryPage<AnswerItem.ItemType>(
        {
          TableName: this.config.mainTableName,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: { ':pk': PK, ':prefix': prefix },
        },
        page,
      );

    return {
      items: items.map((item) => AnswerItem.toEntity(item)),
      nextCursor,
    };
  }
}
