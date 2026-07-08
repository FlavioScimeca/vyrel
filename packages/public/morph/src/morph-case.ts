import { slugify } from "./slugify";
import { toCamelCase } from "./to-camel-case";
import { toKebabCase } from "./to-kebab-case";
import { toSnakeCase } from "./to-snake-case";
import type { CaseStyle, MorphInput } from "./types";

/** Morphs a string into the requested case style. */
export function morphCase(input: MorphInput, style: CaseStyle): string {
  switch (style) {
    case "camel":
      return toCamelCase(input);
    case "kebab":
      return toKebabCase(input);
    case "snake":
      return toSnakeCase(input);
    default:
      return slugify(input);
  }
}
