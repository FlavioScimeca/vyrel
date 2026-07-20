export type BunImageInput =
  | Buffer
  | Uint8Array
  | ArrayBuffer
  | string
  | Blob
  | { path: string }
  | { url: string };

export type BunImageOptions = {
  maxPixels?: number;
};

type BunImageFilter =
  | "nearest"
  | "box"
  | "bilinear"
  | "linear"
  | "cubic"
  | "mitchell"
  | "lanczos2"
  | "lanczos3"
  | "mks2013"
  | "mks2021";

export type BunImageResizeOptions = {
  filter?: BunImageFilter;
  fit?: "fill" | "inside";
  withoutEnlargement?: boolean;
};

export type BunImageWebpOptions = {
  quality?: number;
};

export type BunImageJpegOptions = {
  quality?: number;
};

export type BunImageMetadata = {
  width: number;
  height: number;
  format?: string;
};

export type BunImageLike = {
  resize: (
    width: number,
    height?: number,
    options?: BunImageResizeOptions
  ) => BunImageLike;
  webp: (options?: BunImageWebpOptions) => BunImageLike;
  jpeg: (options?: BunImageJpegOptions) => BunImageLike;
  png: (options?: Record<string, unknown>) => BunImageLike;
  metadata: () => Promise<BunImageMetadata>;
  bytes: () => Promise<Uint8Array>;
  buffer: () => Promise<ArrayBuffer>;
  blob: () => Promise<Blob>;
  dataurl: () => Promise<string>;
  readonly width: number;
  readonly height: number;
};
