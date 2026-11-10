import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Account } from '@application/entities/account/Account';
import type { Lesson } from '@application/entities/outline/Lesson';
import type { Answer } from '@application/entities/question/Answer';
import type { Question } from '@application/entities/question/Question';
import { Conflict } from '@application/errors/common';
import type { QuestionRepository } from '@application/repositories/question/QuestionRepository';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { copyName } from '@infra/database/dynamo/copyName';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { AnswerItem } from '@infra/database/dynamo/items/question/AnswerItem';
import { QuestionItem } from '@infra/database/dynamo/items/question/QuestionItem';
import { queryAll } from '@infra/database/dynamo/queryAll';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoQuestionRepository implements QuestionRepository {
  constructor(private readonly config: AppConfig) {}

  // Strong: a removal and an answer decide on the count read here.
  async findQuestion(
    lessonId: Lesson.Id,
    questionId: Question.Id,
  ): Promise<Question | null> {
    const command = new GetCommand({
      TableName: this.config.mainTableName,
      Key: this.questionKey(lessonId, questionId),
      ConsistentRead: true,
    });
    const { Item } = await dynamoClient.send(command);

    return Item ? QuestionItem.toEntity(Item as QuestionItem.ItemType) : null;
  }

  async findAnswer(
    lessonId: Lesson.Id,
    questionId: Question.Id,
    answerId: Answer.Id,
  ): Promise<Answer | null> {
    const command = new GetCommand({
      TableName: this.config.mainTableName,
      Key: {
        PK: AnswerItem.getPK(lessonId),
        SK: AnswerItem.getSK(questionId, answerId),
      },
      ConsistentRead: true,
    });
    const { Item } = await dynamoClient.send(command);

    return Item ? AnswerItem.toEntity(Item as AnswerItem.ItemType) : null;
  }

  askOperation(question: Question): UnitOfWork.Operation {
    return DynamoUnitOfWork.operation({
      Put: {
        TableName: this.config.mainTableName,
        Item: QuestionItem.fromEntity(question).toItem(),
        ConditionExpression: 'attribute_not_exists(PK)',
      },
    });
  }

  answerOperations(answer: Answer): UnitOfWork.Operation[] {
    return [
      DynamoUnitOfWork.operation({
        Put: {
          TableName: this.config.mainTableName,
          Item: AnswerItem.fromEntity(answer).toItem(),
          ConditionExpression: 'attribute_not_exists(PK)',
        },
      }),
      DynamoUnitOfWork.operation({
        Update: {
          TableName: this.config.mainTableName,
          Key: this.questionKey(answer.lessonId, answer.questionId),
          UpdateExpression: 'ADD answerCount :one',
          ConditionExpression: 'attribute_exists(PK) AND removed = :no',
          ExpressionAttributeValues: { ':one': 1, ':no': false },
        },
      }),
    ];
  }

  async removeQuestion(
    question: Question,
    removal: Question.Removal,
  ): Promise<void> {
    const Key = this.questionKey(question.lessonId, question.id);
    const command =
      removal === 'delete'
        ? new DeleteCommand({
            TableName: this.config.mainTableName,
            Key,
            ConditionExpression: 'answerCount = :none AND removed = :no',
            ExpressionAttributeValues: { ':none': 0, ':no': false },
          })
        : new UpdateCommand({
            TableName: this.config.mainTableName,
            Key,
            UpdateExpression:
              'SET removed = :yes, #text = :empty, authorName = :empty REMOVE GSI1PK, GSI1SK',
            ConditionExpression: 'answerCount > :none AND removed = :no',
            ExpressionAttributeNames: { '#text': 'text' },
            ExpressionAttributeValues: {
              ':yes': true,
              ':no': false,
              ':none': 0,
              ':empty': '',
            },
          });

    try {
      await dynamoClient.send(command);
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new Conflict();
      }

      throw error;
    }
  }

  deleteAnswerOperations(
    answer: Answer,
    question: Question,
  ): UnitOfWork.Operation[] {
    const questionKey = this.questionKey(question.lessonId, question.id);
    const lastOfRemoved = question.removed && question.answerCount === 1;

    return [
      DynamoUnitOfWork.operation({
        Delete: {
          TableName: this.config.mainTableName,
          Key: {
            PK: AnswerItem.getPK(answer.lessonId),
            SK: AnswerItem.getSK(answer.questionId, answer.id),
          },
          ConditionExpression: 'attribute_exists(PK)',
        },
      }),
      DynamoUnitOfWork.operation(
        lastOfRemoved
          ? {
              Delete: {
                TableName: this.config.mainTableName,
                Key: questionKey,
                ConditionExpression: 'answerCount = :read AND removed = :yes',
                ExpressionAttributeValues: {
                  ':read': question.answerCount,
                  ':yes': true,
                },
              },
            }
          : {
              Update: {
                TableName: this.config.mainTableName,
                Key: questionKey,
                UpdateExpression: 'ADD answerCount :minusOne',
                ConditionExpression:
                  'answerCount = :read AND removed = :removed',
                ExpressionAttributeValues: {
                  ':minusOne': -1,
                  ':read': question.answerCount,
                  ':removed': question.removed,
                },
              },
            },
      ),
    ];
  }

  async updateAuthorName(accountId: Account.Id, name: string): Promise<void> {
    const keys = (await queryAll({
      TableName: this.config.mainTableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': QuestionItem.getGSI1PK(accountId) },
      ProjectionExpression: 'PK, SK',
    })) as Record<string, unknown>[];

    await copyName({
      tableName: this.config.mainTableName,
      keys,
      attribute: 'authorName',
      name,
    });
  }

  async deleteByLesson(lessonId: Lesson.Id): Promise<void> {
    for (const prefix of ['QUESTION#', 'ANSWER#']) {
      let startKey: Record<string, unknown> | undefined;

      do {
        const command = new QueryCommand({
          TableName: this.config.mainTableName,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: {
            ':pk': QuestionItem.getPK(lessonId),
            ':prefix': prefix,
          },
          ProjectionExpression: 'PK, SK',
          ConsistentRead: true,
          ExclusiveStartKey: startKey,
        });
        const { Items = [], LastEvaluatedKey } =
          await dynamoClient.send(command);
        const deletions = Items.map(
          (Key) =>
            new DeleteCommand({ TableName: this.config.mainTableName, Key }),
        );

        await Promise.all(
          deletions.map((deletion) => dynamoClient.send(deletion)),
        );
        startKey = LastEvaluatedKey;
      } while (startKey);
    }
  }

  private questionKey(lessonId: Lesson.Id, questionId: Question.Id) {
    return {
      PK: QuestionItem.getPK(lessonId),
      SK: QuestionItem.getSK(questionId),
    };
  }
}
