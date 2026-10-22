import { describe, expect, it, vi } from 'vitest';

import { CdnAssetUrls } from '@infra/gateways/file/CdnAssetUrls';
import { AppConfig } from '@shared/config/AppConfig';

describe('CdnAssetUrls', () => {
  it('should serve a key from the CDN over HTTPS', () => {
    vi.stubEnv('CDN_DOMAIN', 'd123.cloudfront.net');

    expect(new CdnAssetUrls(new AppConfig()).urlOf('account/a/64-x.webp')).toBe(
      'https://d123.cloudfront.net/account/a/64-x.webp',
    );
  });
});
