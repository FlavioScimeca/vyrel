import { splitWords } from "./split-words";
import type { MorphInput, SlugifyOptions } from "./types";

const defaultSlugifyOptions = {
	lowercase: true,
	separator: "-",
} satisfies Required<SlugifyOptions>;

/** Morphs a string into a URL-safe slug. */
export function slugify(
	input: MorphInput,
	options: SlugifyOptions = {},
): string {
	const { lowercase, separator } = { ...defaultSlugifyOptions, ...options };
	const words = splitWords(input).map((word) => word.replace(/[^\w-]+/g, ""));

	const slug = words.filter((word) => word.length > 0).join(separator);

	return lowercase ? slug.toLowerCase() : slug;
}
