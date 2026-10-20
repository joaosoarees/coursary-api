export class ProgressDetails {
  readonly completedLessons: number;
  readonly completedLessonIds: string[];
  readonly lastLessonId: string | null;
  readonly positionSeconds: number | null;

  constructor(attributes: ProgressDetails) {
    this.completedLessons = attributes.completedLessons;
    this.completedLessonIds = attributes.completedLessonIds;
    this.lastLessonId = attributes.lastLessonId;
    this.positionSeconds = attributes.positionSeconds;
  }
}
