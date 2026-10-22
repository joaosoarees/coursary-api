import type { PublicAssetUrls } from '@application/gateways/file/PublicAssetUrls';
import type { AppConfig } from '@shared/config/AppConfig';

export class CdnAssetUrls implements PublicAssetUrls {
  constructor(private readonly config: AppConfig) {}

  urlOf(key: string): string {
    return `https://${this.config.cdnDomain}/${key}`;
  }
}
