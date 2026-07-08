import { splitWords } from "./split-words";
import type { MorphInput } from "./types";

/** Morphs a string into kebab-case. */
export function toKebabCase(input: MorphInput): string {
  return splitWords(input).join("-");
}
