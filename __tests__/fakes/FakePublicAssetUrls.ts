import type { PublicAssetUrls } from '@application/gateways/file/PublicAssetUrls';

export class FakePublicAssetUrls implements PublicAssetUrls {
  urlOf(key: string): string {
    return `https://cdn.example.com/${key}`;
  }
}
