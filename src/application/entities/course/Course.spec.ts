import { describe, expect, it } from 'vitest';

import { Account, accountRoles } from '@application/entities/account/Account';
import { Course, courseStatuses } from '@application/entities/course/Course';
import { Enrollment } from '@application/entities/enrollment/Enrollment';
import { Forbidden } from '@application/errors/common';
import { CourseArchived, CourseNotFound } from '@application/errors/course';

const owner = Account.create({ name: 'Ana', email: 'ana@example.com' });
const other = Account.create({ name: 'Bia', email: 'bia@example.com' });
const student = Account.create({ name: 'Caio', email: 'caio@example.com' });

const courseIn = (status: Course.Status) => {
  const course = Course.create({
    instructor: owner,
    title: 'T',
  });
  course.status = status;

  return course;
};

const enrollmentIn = (course: Course, status: Enrollment.Status = 'ACTIVE') => {
  const enrollment = Enrollment.create({ student, course });
  enrollment.status = status;

  return enrollment;
};

const { Draft, Published, Archived } = courseStatuses;
const { Instructor, Admin, Student } = accountRoles;

describe('Course', () => {
  describe('requireManagedBy', () => {
    it.each([Draft, Published, Archived])(
      'should let the owner and an admin manage a %s course',
      (status) => {
        const course = courseIn(status);

        expect(() => {
          course.requireManagedBy(owner.id, Instructor);
        }).not.toThrow();
        expect(() => {
          course.requireManagedBy(other.id, Admin);
        }).not.toThrow();
      },
    );

    it.each([
      [Draft, CourseNotFound],
      [Published, Forbidden],
      [Archived, Forbidden],
    ])('should refuse anyone else on a %s course', (status, error) => {
      expect(() => {
        courseIn(status).requireManagedBy(other.id, Instructor);
      }).toThrow(error);
    });
  });

  describe('requireEditableBy', () => {
    it('should refuse even the owner on an archived course', () => {
      expect(() => {
        courseIn(Archived).requireEditableBy(owner.id, Instructor);
      }).toThrow(CourseArchived);
    });
  });

  describe('requireReadableBy', () => {
    it.each([Published, Archived])(
      'should let an active enrollment read a %s course',
      (status) => {
        const course = courseIn(status);

        expect(() => {
          course.requireReadableBy(student.id, Student, enrollmentIn(course));
        }).not.toThrow();
      },
    );

    it.each([
      [Draft, 'ACTIVE' as const, CourseNotFound],
      [Published, 'CANCELLED' as const, Forbidden],
    ])(
      'should refuse a %s course to an enrollment that is %s',
      (status, enrollmentStatus, error) => {
        const course = courseIn(status);

        expect(() => {
          course.requireReadableBy(
            student.id,
            Student,
            enrollmentIn(course, enrollmentStatus),
          );
        }).toThrow(error);
      },
    );

    it('should let the owner read a draft without an enrollment', () => {
      expect(() => {
        courseIn(Draft).requireReadableBy(owner.id, Instructor, null);
      }).not.toThrow();
    });
  });

  describe('requireEnrolledIn', () => {
    it('should return the active enrollment of a visible course', () => {
      const course = courseIn(Published);
      const enrollment = enrollmentIn(course);

      expect(course.requireEnrolledIn(student.id, Student, enrollment)).toBe(
        enrollment,
      );
    });

    it.each([
      ['the owner of a draft', Draft, owner.id, Instructor, Forbidden],
      ['an admin of a published course', Published, other.id, Admin, Forbidden],
      ['a stranger to a draft', Draft, other.id, Instructor, CourseNotFound],
      [
        'a stranger to a published course',
        Published,
        other.id,
        Student,
        Forbidden,
      ],
    ])(
      'should refuse %s without an enrollment',
      (_, status, id, role, error) => {
        expect(() => {
          courseIn(status).requireEnrolledIn(id, role, null);
        }).toThrow(error);
      },
    );
  });

  describe('ratingAverage', () => {
    it('should be null before any review and the mean after', () => {
      const course = courseIn(Published);
      expect(course.ratingAverage()).toBeNull();

      course.ratingSum = 9;
      course.ratingCount = 2;
      expect(course.ratingAverage()).toBe(4.5);
    });
  });
});
