import type { File } from '@application/entities/file/File';

// Turns the key of a public variant into the URL that serves it; the table keeps keys,
// so the CDN's domain can change without rewriting anything (Q85, Q382).
export interface PublicAssetUrls {
  urlOf: (key: string) => string;

  // An owner's image as the client sees it: variant name → URL; undefined without one (Q401).
  urlsOf: (copy: File.Copy | undefined) => Record<string, string> | undefined;
}
