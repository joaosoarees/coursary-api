import { describe, expect, it, vi } from 'vitest';

import type { File } from '@application/entities/file/File';
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

describe('CdnAssetUrls.urlsOf', () => {
  it('should serve every variant of an image, and nothing without one', () => {
    vi.stubEnv('CDN_DOMAIN', 'd123.cloudfront.net');
    const urls = new CdnAssetUrls(new AppConfig());

    expect(
      urls.urlsOf({
        fileId: 'f' as File.Id,
        variants: { 480: 'c/480-a.webp' },
      }),
    ).toEqual({ 480: 'https://d123.cloudfront.net/c/480-a.webp' });
    expect(urls.urlsOf(undefined)).toBeUndefined();
  });
});
