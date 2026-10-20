import { describe, expect, it, vi } from 'vitest';

import { Saga } from '@shared/saga/Saga';

describe('Saga', () => {
  it('should return the result and run no compensation when the work succeeds', async () => {
    const saga = new Saga();
    const compensation = vi.fn(() => Promise.resolve());

    const result = await saga.run(() => {
      saga.addCompensation('first', compensation);
      return Promise.resolve('done');
    });

    expect(result).toBe('done');
    expect(compensation).not.toHaveBeenCalled();
  });

  it('should run the compensations in reverse order and rethrow the error', async () => {
    const saga = new Saga();
    const order: string[] = [];
    const failure = new Error('cognito is down');

    await expect(
      saga.run(() => {
        saga.addCompensation('first', () => {
          order.push('first');
          return Promise.resolve();
        });
        saga.addCompensation('second', () => {
          order.push('second');
          return Promise.resolve();
        });
        return Promise.reject(failure);
      }),
    ).rejects.toBe(failure);
    expect(order).toEqual(['second', 'first']);
  });

  it('should keep compensating when one compensation fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const saga = new Saga();
    const last = vi.fn(() => Promise.resolve());

    await expect(
      saga.run(() => {
        saga.addCompensation('last', last);
        saga.addCompensation('failing', () =>
          Promise.reject(new Error('delete failed')),
        );
        return Promise.reject(new Error('cognito is down'));
      }),
    ).rejects.toThrow('cognito is down');
    expect(last).toHaveBeenCalledOnce();
  });

  it('should log the failed step with the saga context', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const saga = new Saga({ accountId: 'acc-1' });

    await expect(
      saga.run(() => {
        saga.addCompensation('deleteAccount', () =>
          Promise.reject(new Error('delete failed')),
        );
        return Promise.reject(new Error('cognito is down'));
      }),
    ).rejects.toThrow('cognito is down');
    expect(JSON.parse(log.mock.calls[0]?.[0] as string)).toEqual({
      event: 'CompensationFailed',
      step: 'deleteAccount',
      accountId: 'acc-1',
      error: 'delete failed',
    });
  });

  it('should start empty for every new saga', async () => {
    const earlier = vi.fn(() => Promise.resolve());
    new Saga().addCompensation('earlier', earlier);

    await expect(
      new Saga().run(() => Promise.reject(new Error('fail'))),
    ).rejects.toThrow('fail');
    expect(earlier).not.toHaveBeenCalled();
  });
});
