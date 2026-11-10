import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import KSUID from 'ksuid';
import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Lesson } from '@application/entities/outline/Lesson';
import { Answer } from '@application/entities/question/Answer';
import { Question } from '@application/entities/question/Question';
import { Conflict } from '@application/errors/common';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { DynamoQuestionRepository } from '@infra/database/dynamo/repositories/question/DynamoQuestionRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();
const repository = new DynamoQuestionRepository(config);
const instructor = Account.create({ name: 'Ana', email: 'ana@example.com' });
const course = Course.create({ instructor, title: 'T' });

const newLesson = () => Lesson.toId(KSUID.randomSync().string);

const ask = async (
  author = Account.create({ name: 'Bia', email: 'b@x.com' }),
) => {
  const question = Question.create({
    author,
    courseId: course.id,
    lessonId: newLesson(),
    text: 'Why?',
  });
  await repository.createQuestion(question);

  return question;
};

const answer = async (question: Question, author = instructor) => {
  const created = Answer.create({ author, question, course, text: 'Because' });
  const unit = new DynamoUnitOfWork();
  unit.add(...repository.answerOperations(created));
  await unit.commit();

  return created;
};

const reload = async (question: Question) =>
  repository.findQuestion(question.lessonId, question.id);

describe('DynamoQuestionRepository', () => {
  it('should store a question and count its answers', async () => {
    const question = await ask();
    const first = await answer(question);
    await answer(question);

    expect(await reload(question)).toMatchObject({
      text: 'Why?',
      answerCount: 2,
      removed: false,
    });
    expect(
      await repository.findAnswer(question.lessonId, question.id, first.id),
    ).toEqual(first);
  });

  it('should delete an unanswered question and refuse when an answer came first', async () => {
    const unanswered = await ask();
    await repository.removeQuestion(unanswered, 'delete');

    const raced = await ask();
    await answer(raced);

    expect(await reload(unanswered)).toBeNull();
    await expect(repository.removeQuestion(raced, 'delete')).rejects.toThrow(
      Conflict,
    );
  });

  it('should keep an answered question removed, without text, author or answers to come', async () => {
    const question = await ask();
    await answer(question);
    const read = await reload(question);

    if (!read) {
      throw new Error('The question was not stored.');
    }

    await repository.removeQuestion(read, read.remove());
    const { Item } = await dynamoClient.send(
      new GetCommand({
        TableName: config.mainTableName,
        Key: {
          PK: `LESSON#${question.lessonId}`,
          SK: `QUESTION#${question.id}`,
        },
        ConsistentRead: true,
      }),
    );

    expect(Item).toMatchObject({ removed: true, text: '', authorName: '' });
    expect(Item).not.toHaveProperty('GSI1PK');
    await expect(answer(question)).rejects.toThrow(Conflict);
  });

  it('should take one off the count, and the removed question with its last answer', async () => {
    const question = await ask();
    const first = await answer(question);
    const second = await answer(question);
    const twice = await reload(question);

    if (!twice) {
      throw new Error('The question was not stored.');
    }

    twice.remove();
    await repository.removeQuestion(twice, 'keep');

    const unit = new DynamoUnitOfWork();
    unit.add(...repository.deleteAnswerOperations(first, twice));
    await unit.commit();
    const once = await reload(question);

    if (!once) {
      throw new Error('The question went with its first answer.');
    }

    expect(once).toMatchObject({ answerCount: 1, removed: true });

    const last = new DynamoUnitOfWork();
    last.add(...repository.deleteAnswerOperations(second, once));
    await last.commit();

    expect(await reload(question)).toBeNull();
  });

  it('should rename an author in their questions and answers', async () => {
    const author = Account.create({
      name: 'Bia',
      email: `${KSUID.randomSync().string}@x.com`,
    });
    const question = await ask(author);
    const reply = await answer(question, author);

    await repository.updateAuthorName(author.id, 'Beatriz');

    expect((await reload(question))?.authorName).toBe('Beatriz');
    expect(
      (await repository.findAnswer(question.lessonId, question.id, reply.id))
        ?.authorName,
    ).toBe('Beatriz');
  });

  it("should delete a lesson's questions and answers and nothing else", async () => {
    const question = await ask();
    await answer(question);
    await dynamoClient.send(
      new PutCommand({
        TableName: config.mainTableName,
        Item: {
          PK: `LESSON#${question.lessonId}`,
          SK: 'CONTENT',
          type: 'LessonContent',
        },
      }),
    );

    await repository.deleteByLesson(question.lessonId);
    const { Items = [] } = await dynamoClient.send(
      new QueryCommand({
        TableName: config.mainTableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': `LESSON#${question.lessonId}` },
        ConsistentRead: true,
      }),
    );

    expect(Items.map((item) => item.SK as string)).toEqual(['CONTENT']);
  });
});
