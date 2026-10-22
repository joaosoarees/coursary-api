// Makes the webp variants of an uploaded image; the decoder stays behind this port (Q380, Q392).
export interface ImageProcessor {
  makeVariants: (input: ImageProcessor.Input) => Promise<ImageProcessor.Result>;
}

export namespace ImageProcessor {
  export interface Size {
    name: string;
    width: number;
    height: number;
  }

  export interface Input {
    bytes: Uint8Array;
    // The type the upload declared; bytes of any other format are rejected.
    contentType: string;
    fit: 'cover' | 'inside';
    sizes: readonly Size[];
  }

  export interface Variant {
    name: string;
    bytes: Uint8Array;
  }

  // `rejected`: the bytes are not an image this service accepts; trying again changes nothing.
  export type Result = { variants: Variant[] } | { rejected: string };
}
