import type { MorphInput } from "./types";

const WHITESPACE_REGEX = /\s+/;

export function splitWords(input: MorphInput): string[] {
  return input
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[\s_-]+/g, " ")
    .trim()
    .split(WHITESPACE_REGEX)
    .filter((word) => word.length > 0)
    .map((word) => word.toLowerCase());
}
