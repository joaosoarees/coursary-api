import type { File } from '@application/entities/file/File';

// Turns the key of a public variant into the URL that serves it; the table keeps keys,
// so the CDN's domain can change without rewriting anything.
export interface PublicAssetUrls {
  urlOf: (key: string) => string;

  urlsOf: (copy: File.Copy | undefined) => Record<string, string> | undefined;
}
