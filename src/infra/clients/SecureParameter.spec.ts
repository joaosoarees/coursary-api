import { describe, expect, it, vi } from 'vitest';

import { SecureParameter } from '@infra/clients/SecureParameter';
import { ssmClient } from '@infra/clients/ssmClient';

describe('SecureParameter', () => {
  it('should read with decryption once per container', async () => {
    const send = vi
      .spyOn(ssmClient, 'send')
      .mockResolvedValue({ Parameter: { Value: 'secret' } } as never);
    const parameter = new SecureParameter('/coursary-api/test/key');

    await expect(parameter.get()).resolves.toBe('secret');
    await expect(parameter.get()).resolves.toBe('secret');

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0].input).toEqual({
      Name: '/coursary-api/test/key',
      WithDecryption: true,
    });
  });

  it('should read again after a failure instead of keeping it', async () => {
    const send = vi
      .spyOn(ssmClient, 'send')
      .mockRejectedValueOnce(new Error('throttled'))
      .mockResolvedValue({ Parameter: { Value: 'secret' } } as never);
    const parameter = new SecureParameter('/coursary-api/test/key');

    await expect(parameter.get()).rejects.toThrow('throttled');
    await expect(parameter.get()).resolves.toBe('secret');
    expect(send).toHaveBeenCalledTimes(2);
  });
});
