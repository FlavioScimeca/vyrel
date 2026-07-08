import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const organizationPlaceholderAssetPath = fileURLToPath(
  new URL("./assets/org/org-placeholder.png", import.meta.url)
);

export function readOrganizationPlaceholderAsset(): Buffer {
  return readFileSync(organizationPlaceholderAssetPath);
}
