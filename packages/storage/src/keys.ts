/**
 * Object storage key builders (placeholder).
 *
 * After `git clone`, adjust `storageKeyLayout` if your R2/S3 bucket
 * uses different prefixes or file extensions.
 *
 * Optional: copy this file to a local override and gitignore it:
 *   cp packages/storage/src/keys.example.ts packages/storage/src/keys.ts
 */

/** Customize these values for your bucket layout. */
export const storageKeyLayout = {
  extensions: {
    premium: "jpg",
    preview: "webp",
    thumb: "webp",
  },
  placeholder: "placeholder",
  placeholder2: "placeholder2",
  premium: "premium",
} as const;

export function placeholderThumbKey(templateId: string): string {
  return `${storageKeyLayout.placeholder}/${templateId}/thumb.${storageKeyLayout.extensions.thumb}`;
}

export function placeholderFullKey(templateId: string): string {
  return `${storageKeyLayout.placeholder}/${templateId}/full.${storageKeyLayout.extensions.thumb}`;
}

export function placeholderPreviewKeys(templateId: string): {
  thumbKey: string;
  imageKey: string;
} {
  return {
    imageKey: placeholderFullKey(templateId),
    thumbKey: placeholderThumbKey(templateId),
  };
}

export function placeholderSourceKey(designId: string, ext: string): string {
  return `${storageKeyLayout.placeholder}/${designId}/source.${ext}`;
}

export function placeholderImageKey(designId: string): string {
  return `${storageKeyLayout.placeholder}/${designId}/preview.${storageKeyLayout.extensions.preview}`;
}

export function designObjectKeys(
  designId: string,
  ext: string
): {
  sourceKey: string;
  thumbKey: string;
  previewImageKey: string;
} {
  return {
    previewImageKey: placeholderImageKey(designId),
    sourceKey: placeholderSourceKey(designId, ext),
    thumbKey: placeholderThumbKey(designId),
  };
}

export function userAvatarObjectKeys(userId: string): {
  thumbKey: string;
  fullKey: string;
} {
  return {
    fullKey: `users/${userId}/full.${storageKeyLayout.extensions.thumb}`,
    thumbKey: `users/${userId}/thumb.${storageKeyLayout.extensions.thumb}`,
  };
}

export function organizationLogoObjectKeys(organizationId: string): {
  thumbKey: string;
  fullKey: string;
} {
  return {
    fullKey: `organizations/${organizationId}/logo/full.${storageKeyLayout.extensions.thumb}`,
    thumbKey: `organizations/${organizationId}/logo/thumb.${storageKeyLayout.extensions.thumb}`,
  };
}

export function organizationPlaceholderObjectKeys(): {
  thumbKey: string;
  fullKey: string;
} {
  return {
    fullKey: `assets/org/placeholder/full.${storageKeyLayout.extensions.thumb}`,
    thumbKey: `assets/org/placeholder/thumb.${storageKeyLayout.extensions.thumb}`,
  };
}
