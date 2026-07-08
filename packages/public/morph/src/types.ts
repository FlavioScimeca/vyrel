/** Supported string case morph styles. */
export type CaseStyle = "camel" | "kebab" | "snake" | "slug";

/** Options for {@link slugify}. */
export interface SlugifyOptions {
  lowercase?: boolean;
  separator?: string;
}

/** Input accepted by case morph utilities. */
export type MorphInput = string;
