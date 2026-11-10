import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Lesson } from '@application/entities/outline/Lesson';
import { Answer } from '@application/entities/question/Answer';
import { Question } from '@application/entities/question/Question';
import { AnswerItem } from '@infra/database/dynamo/items/question/AnswerItem';
import { QuestionItem } from '@infra/database/dynamo/items/question/QuestionItem';

const instructor = Account.create({ name: 'Ana', email: 'ana@example.com' });
const student = Account.create({ name: 'Bia', email: 'bia@example.com' });
const course = Course.create({ instructor, title: 'T' });
const lessonId = Lesson.toId('2HZXtsyCWqKbYadQSGc1G5hSJPo');
const question = Question.create({
  author: student,
  courseId: course.id,
  lessonId,
  text: 'Why?',
});

describe('QuestionItem and AnswerItem', () => {
  it('should keep a question in its lesson, and under its author in GSI1', () => {
    expect(QuestionItem.fromEntity(question).toItem()).toMatchObject({
      PK: `LESSON#${lessonId}`,
      SK: `QUESTION#${question.id}`,
      GSI1PK: `AUTHOR#${student.id}`,
      GSI1SK: `POST#${question.id}`,
      type: 'Question',
    });
  });

  it('should read back the same question it wrote', () => {
    expect(
      QuestionItem.toEntity(QuestionItem.fromEntity(question).toItem()),
    ).toEqual(question);
  });

  it('should leave a removed question out of its author posts', () => {
    const removed = Question.create({
      author: student,
      courseId: course.id,
      lessonId,
      text: 'Why?',
    });
    removed.answerCount = 1;
    removed.remove();

    expect(QuestionItem.fromEntity(removed).toItem()).not.toHaveProperty(
      'GSI1PK',
    );
  });

  it('should keep an answer after its question in the lesson', () => {
    const answer = Answer.create({
      author: instructor,
      question,
      course,
      text: 'Because.',
    });

    expect(AnswerItem.fromEntity(answer).toItem()).toMatchObject({
      PK: `LESSON#${lessonId}`,
      SK: `ANSWER#${question.id}#${answer.id}`,
      GSI1PK: `AUTHOR#${instructor.id}`,
      GSI1SK: `POST#${answer.id}`,
      type: 'Answer',
    });
    expect(AnswerItem.toEntity(AnswerItem.fromEntity(answer).toItem())).toEqual(
      answer,
    );
  });
});
