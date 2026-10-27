import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { Account, accountRoles } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Lesson } from '@application/entities/outline/Lesson';
import { Module } from '@application/entities/outline/Module';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { DynamoCourseProgressQuery } from '@infra/database/dynamo/queries/enrollment/DynamoCourseProgressQuery';
import { DynamoListCourseStudentsQuery } from '@infra/database/dynamo/queries/enrollment/DynamoListCourseStudentsQuery';
import { DynamoCourseOutlineQuery } from '@infra/database/dynamo/queries/outline/DynamoCourseOutlineQuery';
import { DynamoListCourseReviewsQuery } from '@infra/database/dynamo/queries/review/DynamoListCourseReviewsQuery';
import { DynamoAccountRepository } from '@infra/database/dynamo/repositories/account/DynamoAccountRepository';
import { DynamoCourseDeletion } from '@infra/database/dynamo/repositories/course/DynamoCourseDeletion';
import { DynamoCourseRepository } from '@infra/database/dynamo/repositories/course/DynamoCourseRepository';
import { DynamoEnrollmentRepository } from '@infra/database/dynamo/repositories/enrollment/DynamoEnrollmentRepository';
import { DynamoProgressRepository } from '@infra/database/dynamo/repositories/enrollment/DynamoProgressRepository';
import { DynamoStudentExportRepository } from '@infra/database/dynamo/repositories/export/DynamoStudentExportRepository';
import { DynamoFileRepository } from '@infra/database/dynamo/repositories/file/DynamoFileRepository';
import { DynamoLessonRepository } from '@infra/database/dynamo/repositories/outline/DynamoLessonRepository';
import { DynamoModuleRepository } from '@infra/database/dynamo/repositories/outline/DynamoModuleRepository';
import { DynamoReviewRepository } from '@infra/database/dynamo/repositories/review/DynamoReviewRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();

const account = (name: string, role: Account.Role) => {
  const created = Account.create({
    name,
    email: `${name}-${crypto.randomUUID()}@example.com`,
  });
  created.activate();
  created.role = role;

  return created;
};

interface CourseFields {
  status?: Course.Status;
  lessonCount?: number;
  publishedAt?: string;
}

// Writes the fields straight to the stored course, past the repository's rules.
export async function setCourseFields(course: Course, fields: CourseFields) {
  const entries = Object.entries(fields);
  await dynamoClient.send(
    new UpdateCommand({
      TableName: config.mainTableName,
      Key: { PK: `COURSE#${course.id}`, SK: `COURSE#${course.id}` },
      UpdateExpression: `SET ${entries.map(([k]) => `#${k} = :${k}`).join(', ')}`,
      ExpressionAttributeNames: Object.fromEntries(
        entries.map(([k]) => [`#${k}`, k]),
      ),
      ExpressionAttributeValues: Object.fromEntries(
        entries.map(([k, v]) => [`:${k}`, v]),
      ),
    }),
  );
}

// A draft course in DynamoDB Local, its owner, another instructor and an admin.
export async function courseWorld() {
  const accounts = new DynamoAccountRepository(config);
  const courses = new DynamoCourseRepository(config);
  const courseDeletion = new DynamoCourseDeletion(config);
  const modules = new DynamoModuleRepository(config);
  const lessons = new DynamoLessonRepository(config);
  const outline = new DynamoCourseOutlineQuery(config);
  const enrollments = new DynamoEnrollmentRepository(config);
  const students = new DynamoListCourseStudentsQuery(config);
  const progress = new DynamoProgressRepository(config);
  const courseProgress = new DynamoCourseProgressQuery(config);
  const reviews = new DynamoReviewRepository(config);
  const courseReviews = new DynamoListCourseReviewsQuery(config);
  const files = new DynamoFileRepository(config);
  const studentExports = new DynamoStudentExportRepository(config);
  const unitOfWork = () => new DynamoUnitOfWork();
  const owner = account('ana', accountRoles.Instructor);
  const other = account('bia', accountRoles.Instructor);
  const admin = account('caio', accountRoles.Admin);
  const course = Course.create({
    instructor: owner,
    title: 'T',
  });
  await courses.create(course);

  const as = (caller: Account) => ({
    callerId: caller.id,
    callerRole: caller.role,
    courseId: course.id,
  });

  const setCourse = (fields: CourseFields) => setCourseFields(course, fields);

  const addModule = async (title: string, position: number) => {
    const module = Module.create({ courseId: course.id, title, position });
    const unit = unitOfWork();
    unit.add(modules.createOperation(module));
    await unit.commit();

    return module;
  };

  const addLesson = async (module: Module, position: number) => {
    const lesson = Lesson.create({
      courseId: course.id,
      moduleId: module.id,
      title: `L${String(position)}`,
      body: '',
      durationMinutes: 5,
      position,
    });
    const unit = unitOfWork();
    unit.add(
      ...lessons.createOperations(lesson),
      modules.addLessonsOperation(course.id, module.id, 1),
      courses.addLessonsOperation(course, 1),
    );
    await unit.commit();

    return lesson;
  };

  const storedCourse = async () => courses.findById(course.id);

  return {
    accounts,
    courses,
    courseDeletion,
    modules,
    lessons,
    outline,
    enrollments,
    students,
    progress,
    courseProgress,
    reviews,
    courseReviews,
    files,
    studentExports,
    unitOfWork,
    owner,
    other,
    admin,
    course,
    as,
    setCourse,
    addModule,
    addLesson,
    storedCourse,
  };
}
