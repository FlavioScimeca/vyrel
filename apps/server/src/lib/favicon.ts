import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const resolveFaviconPath = (): string => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(dir, "public/favicon.ico"),
    join(dir, "../public/favicon.ico"),
    join(dir, "../../public/favicon.ico"),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      return path;
    }
  }

  throw new Error("favicon.ico not found");
};

export const faviconPath = resolveFaviconPath();
