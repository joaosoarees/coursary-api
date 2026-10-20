import { z } from 'zod';

import type { Page } from '@application/contracts/Page';
import type { ListCourseReviewsQuery } from '@application/queries/review/ListCourseReviewsQuery';
import { ReviewSummary } from '@application/queries/review/ReviewSummary';
import { DynamoPagination } from '@infra/database/dynamo/DynamoPagination';
import { ReviewItem } from '@infra/database/dynamo/items/review/ReviewItem';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoListCourseReviewsQuery implements ListCourseReviewsQuery {
  constructor(private readonly config: AppConfig) {}

  async execute({
    courseId,
    page,
  }: ListCourseReviewsQuery.Input): Promise<Page<ReviewSummary>> {
    const GSI1PK = ReviewItem.getGSI1PK(courseId);
    const pagination = new DynamoPagination(
      z.strictObject({
        GSI1PK: z.literal(GSI1PK),
        GSI1SK: z.string().startsWith('REVIEW#'),
        PK: z.string().startsWith('ACCOUNT#'),
        SK: z.literal(ReviewItem.getSK(courseId)),
      }),
    );

    const { items, nextCursor } =
      await pagination.queryPage<ReviewItem.ItemType>(
        {
          TableName: this.config.mainTableName,
          IndexName: 'GSI1',
          KeyConditionExpression:
            'GSI1PK = :pk AND begins_with(GSI1SK, :prefix)',
          ExpressionAttributeValues: { ':pk': GSI1PK, ':prefix': 'REVIEW#' },
          ScanIndexForward: false,
        },
        page,
      );

    return {
      items: items.map((item) =>
        ReviewSummary.fromReview(ReviewItem.toEntity(item)),
      ),
      nextCursor,
    };
  }
}
