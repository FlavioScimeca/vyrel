import { Effect } from "effect";
import type { z } from "zod/v4";

type FieldConfig = {
  validate?: unknown;
  [key: string]: unknown;
};

type ZodObjectLike = {
  shape: Record<string, z.ZodType>;
};

function isZodObjectLike(
  schema: z.ZodType
): schema is ZodObjectLike & z.ZodType {
  return (
    "shape" in schema && typeof (schema as ZodObjectLike).shape === "object"
  );
}

function isPlainFieldConfig(field: unknown): field is FieldConfig {
  return (
    typeof field === "object" &&
    field !== null &&
    Object.getPrototypeOf(field) === Object.prototype
  );
}

/**
 * Merges Zod field validators onto plain Pothos input/arg field configs
 * so `@pothos/plugin-validation` runs them at the GraphQL boundary.
 *
 * Morph `inputsFrom` already attaches `validate` when building fields — those
 * InputFieldRefs are left unchanged. Use this for hand-built field maps.
 */
export function withZodValidation<TFields extends Record<string, unknown>>(
  fields: TFields,
  schema: z.ZodType
): TFields {
  if (!isZodObjectLike(schema)) {
    return fields;
  }

  const { shape } = schema;
  const result = { ...fields } as Record<string, unknown>;

  for (const key of Object.keys(fields)) {
    const fieldSchema = shape[key];
    const field = fields[key];
    if (fieldSchema === undefined || field === undefined) {
      continue;
    }

    if (isPlainFieldConfig(field)) {
      result[key] = {
        ...field,
        validate: fieldSchema,
      };
    }
  }

  return result as TFields;
}

/**
 * Same as `withZodValidation` for query/mutation arg maps.
 * Morph `argsFrom` does not attach validate — use `parseArgsEffect` for
 * refined list schemas, or hand-built args with `validate` options.
 */
export function withZodArgsValidation<TArgs extends Record<string, unknown>>(
  args: TArgs,
  schema: z.ZodType
): TArgs {
  return withZodValidation(args, schema);
}

/** Parse GraphQL args with Zod inside an Effect (maps ZodError at the runner). */
export function parseArgsEffect<T>(
  schema: { parse: (value: unknown) => T },
  value: unknown
): Effect.Effect<T, unknown> {
  return Effect.try({
    catch: (cause) => cause,
    try: () => schema.parse(value),
  });
}
