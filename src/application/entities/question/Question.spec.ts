import { describe, expect, it } from 'vitest';

import { Account, accountRoles } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Lesson } from '@application/entities/outline/Lesson';
import { Question } from '@application/entities/question/Question';

const instructor = Account.create({ name: 'Ana', email: 'ana@example.com' });
const student = Account.create({ name: 'Bia', email: 'bia@example.com' });
const other = Account.create({ name: 'Caio', email: 'caio@example.com' });
const course = Course.create({ instructor, title: 'T' });
const lessonId = Lesson.toId('2HZXtsyCWqKbYadQSGc1G5hSJPo');

const ask = () =>
  Question.create({
    author: student,
    courseId: course.id,
    lessonId,
    text: '  Why?  ',
  });

describe('Question', () => {
  it('should copy the author name and trim the text', () => {
    expect(ask()).toMatchObject({
      authorId: student.id,
      authorName: 'Bia',
      text: 'Why?',
      answerCount: 0,
      removed: false,
    });
  });

  it('should let the author and whoever manages the course delete it', () => {
    const question = ask();

    expect(
      question.canBeDeletedBy(student.id, accountRoles.Student, course),
    ).toBe(true);
    expect(
      question.canBeDeletedBy(instructor.id, accountRoles.Instructor, course),
    ).toBe(true);
    expect(question.canBeDeletedBy(other.id, accountRoles.Admin, course)).toBe(
      true,
    );
    expect(
      question.canBeDeletedBy(other.id, accountRoles.Student, course),
    ).toBe(false);
  });

  it('should be deleted outright while nobody answered it', () => {
    const question = ask();

    expect(question.remove()).toBe('delete');
  });

  it('should stay without its text and author once answered', () => {
    const question = ask();
    question.answerCount = 2;

    expect(question.remove()).toBe('keep');
    expect(question).toMatchObject({ removed: true, text: '', authorName: '' });
    expect(
      question.canBeDeletedBy(student.id, accountRoles.Admin, course),
    ).toBe(false);
  });
});
