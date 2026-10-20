import { describe, expect, it, vi } from 'vitest';
import { z, ZodError } from 'zod';

import { lambdaInvokeAdapter } from '@main/adapters/lambdaInvokeAdapter';

const schema = z.object({ email: z.email() });

describe('lambdaInvokeAdapter', () => {
  it('should run the use case with the validated payload and return its result', async () => {
    const execute = vi.fn().mockResolvedValue({ changed: true });

    await expect(
      lambdaInvokeAdapter(schema, { execute })({ email: 'ana@example.com' }),
    ).resolves.toEqual({ changed: true });
    expect(execute).toHaveBeenCalledWith({ email: 'ana@example.com' });
  });

  it('should refuse a payload outside the schema without running the use case', async () => {
    const execute = vi.fn();

    await expect(
      Promise.resolve().then(() =>
        lambdaInvokeAdapter(schema, { execute })({ mail: 'x' }),
      ),
    ).rejects.toBeInstanceOf(ZodError);
    expect(execute).not.toHaveBeenCalled();
  });
});
