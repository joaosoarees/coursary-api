export interface Page<TItem> {
  items: TItem[];
  nextCursor: string | null;
}

export namespace Page {
  export interface Options {
    limit: number;
    cursor?: string;
  }
}
