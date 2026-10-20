import type { ZodType } from 'zod';

interface UseCase<TInput, TOutput> {
  execute: (input: TInput) => Promise<TOutput>;
}

export function lambdaInvokeAdapter<TInput, TOutput>(
  schema: ZodType<TInput>,
  useCase: UseCase<TInput, TOutput>,
) {
  return (event: unknown): Promise<TOutput> =>
    useCase.execute(schema.parse(event));
}
