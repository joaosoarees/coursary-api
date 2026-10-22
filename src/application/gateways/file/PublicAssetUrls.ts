// Turns the key of a public variant into the URL that serves it; the table keeps keys,
// so the CDN's domain can change without rewriting anything (Q85, Q382).
export interface PublicAssetUrls {
  urlOf: (key: string) => string;
}
