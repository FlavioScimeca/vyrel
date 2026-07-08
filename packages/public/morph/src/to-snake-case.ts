import { splitWords } from "./split-words";
import type { MorphInput } from "./types";

/** Morphs a string into snake_case. */
export function toSnakeCase(input: MorphInput): string {
	return splitWords(input).join("_");
}
