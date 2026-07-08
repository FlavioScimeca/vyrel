import type { MorphInput } from "./types";

export function splitWords(input: MorphInput): string[] {
	return input
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/[\s_-]+/g, " ")
		.trim()
		.split(/\s+/)
		.filter((word) => word.length > 0)
		.map((word) => word.toLowerCase());
}
