import type { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';

// The lesson a connection listens to; a connection without one only hears its account's news.
export interface RealtimeLesson {
  courseId: Course.Id;
  lessonId: Lesson.Id;
}
