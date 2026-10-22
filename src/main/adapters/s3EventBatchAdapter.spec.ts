import type { SQSRecord } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { s3EventBatchAdapter } from '@main/adapters/s3EventBatchAdapter';

const message = (messageId: string, body: unknown) =>
  ({ messageId, body: JSON.stringify(body) }) as SQSRecord;

const created = (key: string, bucket = 'private-bucket') => ({
  eventName: 'ObjectCreated:Post',
  s3: { bucket: { name: bucket }, object: { key, eTag: 'abc' } },
});

const setup = (
  execute = vi.fn<(input: { key: string; eTag: string }) => Promise<void>>(() =>
    Promise.resolve(),
  ),
) => ({
  execute,
  handler: s3EventBatchAdapter(() => 'private-bucket', { execute }),
});

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('s3EventBatchAdapter', () => {
  it('should pass each created object with its decoded key and ETag', async () => {
    const { execute, handler } = setup();

    const response = await handler({
      Records: [
        message('m1', {
          Records: [created('account/a/avatar/f/my+photo%C3%A7.png')],
        }),
      ],
    });

    expect(execute).toHaveBeenCalledWith({
      key: 'account/a/avatar/f/my photoç.png',
      eTag: 'abc',
    });
    expect(response.batchItemFailures).toEqual([]);
  });

  it('should let the test event and foreign records go without running anything', async () => {
    const { execute, handler } = setup();

    const response = await handler({
      Records: [
        message('m1', { Service: 'Amazon S3', Event: 's3:TestEvent' }),
        message('m2', {
          Records: [
            created('k', 'other-bucket'),
            { ...created('k'), eventName: 'ObjectRemoved:Delete' },
          ],
        }),
      ],
    });

    expect(execute).not.toHaveBeenCalled();
    expect(response.batchItemFailures).toEqual([]);
  });

  it('should send back only the messages that failed or could not be read', async () => {
    const { handler } = setup(
      vi.fn(({ key }: { key: string }) =>
        key === 'bad' ? Promise.reject(new Error('down')) : Promise.resolve(),
      ),
    );

    const response = await handler({
      Records: [
        message('m1', { Records: [created('good')] }),
        message('m2', { Records: [created('bad')] }),
        message('m3', { unexpected: true }),
      ],
    });

    expect(response.batchItemFailures).toEqual([
      { itemIdentifier: 'm2' },
      { itemIdentifier: 'm3' },
    ]);
  });
});
