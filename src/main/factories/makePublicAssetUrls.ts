import type { PublicAssetUrls } from '@application/gateways/file/PublicAssetUrls';
import { CdnAssetUrls } from '@infra/gateways/file/CdnAssetUrls';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makePublicAssetUrls(): PublicAssetUrls {
  const appConfig = makeAppConfig();

  return new CdnAssetUrls(appConfig);
}
