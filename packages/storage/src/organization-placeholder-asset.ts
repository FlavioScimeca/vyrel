import { fileURLToPath } from "node:url";
import { Effect } from "effect";

import { ObjectStorageError } from "./errors";

const organizationPlaceholderAssetPath = fileURLToPath(
  new URL("./assets/org/org-placeholder.png", import.meta.url)
);

export const readOrganizationPlaceholderAsset = Effect.tryPromise({
  catch: (cause) =>
    new ObjectStorageError({
      cause,
      message: "Unable to read organization placeholder asset.",
      operation: "readOrganizationPlaceholderAsset",
    }),
  try: () =>
    Bun.file(organizationPlaceholderAssetPath)
      .arrayBuffer()
      .then((bytes) => Buffer.from(bytes)),
});
