import { env } from "@vyrel/env/server";

import { readImageDimensionsFromBuffer } from "../../../lib/media/read-image-dimensions";

const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const MAX_LOGO_PIXELS_PER_SIDE = 4096;
const FILE_EXTENSION_PATTERN = /\.([^.]+)$/i;

export type ValidatedOrganizationLogoFile = {
  readonly buffer: Buffer;
  readonly extension: string;
  readonly contentType: string;
};

function extensionFromFileName(fileName: string): string | null {
  const match = FILE_EXTENSION_PATTERN.exec(fileName);
  const extension = match?.[1]?.toLowerCase();

  if (extension === undefined || !ALLOWED_EXTENSIONS.has(extension)) {
    return null;
  }

  return extension;
}

function contentTypeForExtension(extension: string): string {
  switch (extension) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

export function validateOrganizationLogoFile(file: File): Promise<
  | { readonly ok: true; readonly file: ValidatedOrganizationLogoFile }
  | {
      readonly ok: false;
      readonly message: string;
    }
> {
  if (file.size === 0) {
    return Promise.resolve({ message: "Logo image is empty.", ok: false });
  }

  if (file.size > Math.min(env.MEDIA_MAX_UPLOAD_BYTES, MAX_LOGO_BYTES)) {
    return Promise.resolve({
      message: "Logo exceeds the 5 MB upload limit.",
      ok: false,
    });
  }

  const extension = extensionFromFileName(file.name);
  if (extension === null) {
    return Promise.resolve({
      message: "Upload a PNG, JPG, JPEG, WebP, or GIF logo.",
      ok: false,
    });
  }

  if (file.type.length > 0 && !ALLOWED_MIME_TYPES.has(file.type)) {
    return Promise.resolve({
      message: "Upload a PNG, JPG, JPEG, WebP, or GIF logo.",
      ok: false,
    });
  }

  return file.arrayBuffer().then((arrayBuffer) => {
    const buffer = Buffer.from(arrayBuffer);
    const dimensions = readImageDimensionsFromBuffer(buffer);

    if (
      dimensions !== null &&
      (dimensions.width > MAX_LOGO_PIXELS_PER_SIDE ||
        dimensions.height > MAX_LOGO_PIXELS_PER_SIDE)
    ) {
      return {
        message: `Logo exceeds ${MAX_LOGO_PIXELS_PER_SIDE}px per side.`,
        ok: false as const,
      };
    }

    return {
      file: {
        buffer,
        contentType:
          file.type.length > 0 ? file.type : contentTypeForExtension(extension),
        extension,
      },
      ok: true as const,
    };
  });
}
