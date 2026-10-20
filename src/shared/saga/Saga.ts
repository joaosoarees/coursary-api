type Compensation = () => Promise<void>;

export class Saga {
  private readonly compensations: { step: string; run: Compensation }[] = [];

  constructor(private readonly context: Record<string, unknown> = {}) {}

  addCompensation(step: string, run: Compensation): void {
    this.compensations.unshift({ step, run });
  }

  async run<TResult>(work: () => Promise<TResult>): Promise<TResult> {
    try {
      return await work();
    } catch (error) {
      await this.compensate();
      throw error;
    }
  }

  private async compensate(): Promise<void> {
    for (const { step, run } of this.compensations) {
      try {
        await run();
      } catch (error) {
        console.error(
          JSON.stringify({
            event: 'CompensationFailed',
            step,
            ...this.context,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    }
  }
}
