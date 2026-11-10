import { uniqueEmail } from '@tests/support/accountWorld';
import { courseWorld } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import type { Question } from '@application/entities/question/Question';
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

  return { ...world, lesson, student, enroll, ask, answer, stored };
}
