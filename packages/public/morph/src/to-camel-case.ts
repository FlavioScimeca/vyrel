import { splitWords } from "./split-words";
import type { MorphInput } from "./types";

/** Morphs a string into camelCase. */
export function toCamelCase(input: MorphInput): string {
	const words = splitWords(input);

	if (words.length === 0) {
		return "";
	}

	return words
		.map((word, index) => {
			if (index === 0) {
				return word;
			}

			const [first, ...rest] = word;
			return `${first?.toUpperCase() ?? ""}${rest.join("")}`;
		})
		.join("");
}
