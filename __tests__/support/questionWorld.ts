import KSUID from 'ksuid';

import { uniqueEmail } from '@tests/support/accountWorld';
import { courseWorld } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import { Answer } from '@application/entities/question/Answer';
import { Question } from '@application/entities/question/Question';
import { AnswerQuestionUseCase } from '@application/usecases/question/AnswerQuestionUseCase';
import { AskQuestionUseCase } from '@application/usecases/question/AskQuestionUseCase';

// A published course with one lesson and one enrolled student.
export async function questionWorld() {
  const world = await courseWorld();
  const module = await world.addModule('M1', 0);
  const lesson = await world.addLesson(module, 0);
  await world.setCourse({ status: 'PUBLISHED' });

  const enroll = async (name: string) => {
    const student = Account.create({ name, email: uniqueEmail(name) });
    student.activate();
    const unit = world.unitOfWork();
    unit.add(
      world.enrollments.createOperation(
        Enrollment.create({ student, course: world.course }),
      ),
    );
    await unit.commit();

    return student;
  };

  const student = await enroll('duda');
  const askQuestion = new AskQuestionUseCase(
    world.courses,
    world.enrollments,
    world.lessons,
    world.questions,
    world.unitOfWork,
  );
  const answerQuestion = new AnswerQuestionUseCase(
    world.courses,
    world.enrollments,
    world.questions,
    world.unitOfWork,
  );

  const ask = (author: Account = student, text = 'Why?') =>
    askQuestion.execute({
      author,
      courseId: world.course.id,
      lessonId: lesson.id,
      text,
    });

  const answer = (questionId: string, author: Account = world.owner) =>
    answerQuestion.execute({
      author,
      courseId: world.course.id,
      lessonId: lesson.id,
      questionId: questionId as Question.Id,
      text: 'Because.',
    });

  const stored = (questionId: string) =>
    world.questions.findQuestion(lesson.id, questionId as Question.Id);

  // KSUIDs order by the second only: these write at a chosen second, so an order can be asserted.
  const at = (second: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, second));

  const storeQuestion = async (second: number, text: string) => {
    const question = new Question({
      id: Question.toId(KSUID.randomSync(at(second)).string),
      courseId: world.course.id,
      lessonId: lesson.id,
      authorId: student.id,
      authorName: student.name,
      text,
      answerCount: 0,
      removed: false,
      createdAt: at(second),
    });
    const unit = world.unitOfWork();
    unit.add(world.questions.askOperation(question));
    await unit.commit();

    return question;
  };

  const storeAnswer = async (
    question: Question,
    second: number,
    author: Account = world.owner,
  ) => {
    const stored = new Answer({
      id: Answer.toId(KSUID.randomSync(at(second)).string),
      courseId: world.course.id,
      lessonId: lesson.id,
      questionId: question.id,
      authorId: author.id,
      authorName: author.name,
      text: 'Because.',
      byInstructor: world.course.isOwnedBy(author.id),
      createdAt: at(second),
    });
    const unit = world.unitOfWork();
    unit.add(...world.questions.answerOperations(stored));
    await unit.commit();

    return stored;
  };

  return {
    ...world,
    lesson,
    student,
    enroll,
    ask,
    answer,
    stored,
    storeQuestion,
    storeAnswer,
  };
}
