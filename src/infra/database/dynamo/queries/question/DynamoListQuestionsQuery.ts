import { z } from 'zod';

import type { Page } from '@application/contracts/Page';
import type { Question } from '@application/entities/question/Question';
import type { ListQuestionsQuery } from '@application/queries/question/ListQuestionsQuery';
import { DynamoPagination } from '@infra/database/dynamo/DynamoPagination';
import { QuestionItem } from '@infra/database/dynamo/items/question/QuestionItem';
import type { AppConfig } from '@shared/config/AppConfig';

// Newest first: the ids sort by time.
export class DynamoListQuestionsQuery implements ListQuestionsQuery {
  constructor(private readonly config: AppConfig) {}

  async execute({
    lessonId,
    page,
  }: ListQuestionsQuery.Input): Promise<Page<Question>> {
    const PK = QuestionItem.getPK(lessonId);
    const pagination = new DynamoPagination(
      z.strictObject({
        PK: z.literal(PK),
        SK: z.string().startsWith('QUESTION#'),
      }),
    );

    const { items, nextCursor } =
      await pagination.queryPage<QuestionItem.ItemType>(
        {
          TableName: this.config.mainTableName,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: { ':pk': PK, ':prefix': 'QUESTION#' },
          ScanIndexForward: false,
        },
        page,
      );

    return {
      items: items.map((item) => QuestionItem.toEntity(item)),
      nextCursor,
    };
  }
}
