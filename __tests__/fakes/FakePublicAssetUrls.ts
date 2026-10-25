import type { File } from '@application/entities/file/File';
import type { PublicAssetUrls } from '@application/gateways/file/PublicAssetUrls';

export class FakePublicAssetUrls implements PublicAssetUrls {
  urlOf(key: string): string {
    return `https://cdn.example.com/${key}`;
  }

  urlsOf(copy: File.Copy | undefined): Record<string, string> | undefined {
    return copy
      ? Object.fromEntries(
          Object.entries(copy.variants).map(([name, key]) => [
            name,
            this.urlOf(key),
          ]),
        )
      : undefined;
  }
}
