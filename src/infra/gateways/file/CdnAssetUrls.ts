import type { File } from '@application/entities/file/File';
import type { PublicAssetUrls } from '@application/gateways/file/PublicAssetUrls';
import type { AppConfig } from '@shared/config/AppConfig';

export class CdnAssetUrls implements PublicAssetUrls {
  constructor(private readonly config: AppConfig) {}

  urlOf(key: string): string {
    return `https://${this.config.cdnDomain}/${key}`;
  }

  urlsOf(copy: File.Copy | undefined): Record<string, string> | undefined {
    if (!copy) {
      return undefined;
    }

    return Object.fromEntries(
      Object.entries(copy.variants).map(([name, key]) => [
        name,
        this.urlOf(key),
      ]),
    );
  }
}
