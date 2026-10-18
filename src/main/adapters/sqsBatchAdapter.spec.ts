import type { SQSRecord } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { sqsBatchAdapter } from '@main/adapters/sqsBatchAdapter';

const message = (messageId: string, body: unknown) =>
  ({ messageId, body: JSON.stringify(body) }) as SQSRecord;

const schema = z.object({ n: z.number() });
const failingOn2 = () =>
  vi.fn(({ n }: { n: number }) =>
    n === 2 ? Promise.reject(new Error('down')) : Promise.resolve(),
  );
const batch = {
  Records: [
    message('m1', { n: 1 }),
    message('m2', { n: 2 }),
    message('m3', { n: 3 }),
  ],
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('sqsBatchAdapter', () => {
  it('should run every message in order and report no failure', async () => {
    const seen: number[] = [];
    const handler = sqsBatchAdapter(
      schema,
      {
        execute: ({ n }) => {
          seen.push(n);

          return Promise.resolve();
        },
      },
      { ordered: true },
    );

    await expect(
      handler({ Records: [message('m1', { n: 1 }), message('m2', { n: 2 })] }),
    ).resolves.toEqual({ batchItemFailures: [] });
    expect(seen).toEqual([1, 2]);
  });

  it('should give back, when ordered, the failed message and every one after it, unread', async () => {
    const execute = failingOn2();
    const handler = sqsBatchAdapter(schema, { execute }, { ordered: true });

    await expect(handler(batch)).resolves.toEqual({
      batchItemFailures: [{ itemIdentifier: 'm2' }, { itemIdentifier: 'm3' }],
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('should give back, when not ordered, only the failed message', async () => {
    const execute = failingOn2();
    const handler = sqsBatchAdapter(schema, { execute }, { ordered: false });

    await expect(handler(batch)).resolves.toEqual({
      batchItemFailures: [{ itemIdentifier: 'm2' }],
    });
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it('should treat a message that does not parse as failed', async () => {
    const handler = sqsBatchAdapter(
      schema,
      { execute: () => Promise.resolve() },
      { ordered: false },
    );

    await expect(
      handler({ Records: [message('m1', { n: 'x' })] }),
    ).resolves.toEqual({ batchItemFailures: [{ itemIdentifier: 'm1' }] });
  });
});
