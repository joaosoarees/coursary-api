import { describe, expect, it } from 'vitest';

import { Account, accountRoles } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Lesson } from '@application/entities/outline/Lesson';
import { Answer } from '@application/entities/question/Answer';
import { Question } from '@application/entities/question/Question';

const instructor = Account.create({ name: 'Ana', email: 'ana@example.com' });
const student = Account.create({ name: 'Bia', email: 'bia@example.com' });
const other = Account.create({ name: 'Caio', email: 'caio@example.com' });
const course = Course.create({ instructor, title: 'T' });
const question = Question.create({
  author: student,
  courseId: course.id,
  lessonId: Lesson.toId('2HZXtsyCWqKbYadQSGc1G5hSJPo'),
  text: 'Why?',
});

describe('Answer', () => {
  it('should mark the answer of the course owner as the instructor one', () => {
    const fromOwner = Answer.create({
      author: instructor,
      question,
      course,
      text: ' Because. ',
    });
    const fromStudent = Answer.create({
      author: other,
      question,
      course,
      text: 'Me too',
    });

    expect(fromOwner).toMatchObject({
      questionId: question.id,
      lessonId: question.lessonId,
      authorName: 'Ana',
      text: 'Because.',
      byInstructor: true,
    });
    expect(fromStudent.byInstructor).toBe(false);
  });

  it('should let the author and whoever manages the course delete it', () => {
    const answer = Answer.create({
      author: other,
      question,
      course,
      text: 'A',
    });

    expect(answer.canBeDeletedBy(other.id, accountRoles.Student, course)).toBe(
      true,
    );
    expect(
      answer.canBeDeletedBy(instructor.id, accountRoles.Instructor, course),
    ).toBe(true);
    expect(
      answer.canBeDeletedBy(student.id, accountRoles.Student, course),
    ).toBe(false);
  });
});
