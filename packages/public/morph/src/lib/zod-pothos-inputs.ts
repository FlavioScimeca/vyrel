import type { InputFieldsFromShape } from "@pothos/core";
import { MutationFieldBuilder, QueryFieldBuilder } from "@pothos/core";
import { z } from "zod/v4";

import { builder } from "../pothos";
import type {
  AppSchemaTypes,
  TypeMutationFieldBuilder,
  TypeQueryFieldBuilder,
} from "../types";

type PothosSchemaBuilder = typeof builder;

/** Flat Zod object shape (e.g. `mySchema.shape`). */
export type ZodObjectShape = Record<string, z.ZodType>;

/** String keys from a Zod schema's output type (works with omit/extend/partial chains). */
type KnownZodSchemaKeys<TSchema extends z.ZodType> = Extract<
  keyof z.output<TSchema>,
  string
>;

export type ZodSchemaKeys<TSchema extends z.ZodType> = [
  KnownZodSchemaKeys<TSchema>,
] extends [never]
  ? string
  : KnownZodSchemaKeys<TSchema>;

export type PothosInputFieldType = Parameters<
  TypeMutationFieldBuilder["input"]["field"]
>[0]["type"];

/** Keys must match fields on the Zod shape that need non-String GraphQL types. */
export type PothosFieldTypesMap<TShape extends ZodObjectShape> = Partial<
  Record<keyof TShape & string, PothosInputFieldType>
>;

export type PothosSchemaFieldTypesMap<TSchema extends z.ZodType> = Partial<
  Record<ZodSchemaKeys<TSchema>, PothosInputFieldType>
>;

type PothosInputField =
  | ReturnType<TypeMutationFieldBuilder["input"]["string"]>
  | ReturnType<TypeMutationFieldBuilder["input"]["boolean"]>
  | ReturnType<TypeMutationFieldBuilder["input"]["float"]>
  | ReturnType<TypeMutationFieldBuilder["input"]["int"]>
  | ReturnType<TypeMutationFieldBuilder["input"]["field"]>;

type PothosQueryArgField =
  | ReturnType<TypeQueryFieldBuilder["arg"]["string"]>
  | ReturnType<TypeQueryFieldBuilder["arg"]["boolean"]>
  | ReturnType<TypeQueryFieldBuilder["arg"]["float"]>
  | ReturnType<TypeQueryFieldBuilder["arg"]["int"]>
  | ReturnType<TypeQueryFieldBuilder["arg"]>;

export type PothosInputsRequiredOption =
  | boolean
  | ReadonlySet<string>
  | ((key: string, field: z.ZodType) => boolean);

export type PothosUnmappedFieldPolicy = "omit" | "throw" | "warn";

/** Field names to omit from the generated GraphQL input. */
export type PothosInputExclude<TShape extends ZodObjectShape> =
  readonly (keyof TShape & string)[];

export type PothosInputExcludeFromSchema<TSchema extends z.ZodType> =
  readonly ZodSchemaKeys<TSchema>[];

/**
 * Maps Zod object fields to Pothos `withInput` fields.
 *
 * `ZodBoolean`, `ZodDate`, `ZodNumber`, and `ZodEnum` are inferred automatically.
 * GraphQL enums are matched to existing `builder.enumType(...)` definitions by
 * comparing allowed values. Use `fieldTypes` only for overrides (e.g. `File`).
 */
export type PothosInputsFromZodSchemaOptions<
  TSchema extends z.ZodType = z.ZodType,
> = {
  /** @example exclude: ['orgId'] */
  exclude?: PothosInputExcludeFromSchema<TSchema>;
  /** Field-keyed enum refs from `defineDrizzleGraphqlFields`. */
  enumRegistry?: Readonly<Record<string, PothosInputFieldType>>;
  /** Per-field GraphQL type overrides (scalars, ambiguous enums, etc.). */
  fieldTypes?: PothosSchemaFieldTypesMap<TSchema>;
  required?: PothosInputsRequiredOption;
  unmappedFields?: PothosUnmappedFieldPolicy;
};

type ZodSchemaExcludedKeys<TOptions> = TOptions extends {
  readonly exclude: infer E extends readonly string[];
}
  ? E[number]
  : never;

/** Zod output shape exposed on GraphQL after `exclude` is applied. */
export type PothosZodSchemaGraphqlShape<
  TSchema extends z.ZodType,
  TOptions extends PothosInputsFromZodSchemaOptions<TSchema> = Record<
    string,
    never
  >,
> = Omit<z.output<TSchema>, ZodSchemaExcludedKeys<TOptions>>;

/** Pothos `withInput` field map inferred from a Zod object schema. */
export type PothosInputFieldsFromZodSchema<
  TSchema extends z.ZodType,
  TOptions extends PothosInputsFromZodSchemaOptions<TSchema> = Record<
    string,
    never
  >,
> = InputFieldsFromShape<
  AppSchemaTypes,
  PothosZodSchemaGraphqlShape<TSchema, TOptions>,
  "InputObject"
>;

/** Pothos query `args` field map inferred from a Zod object schema. */
export type PothosArgsFieldsFromZodSchema<
  TSchema extends z.ZodType,
  TOptions extends PothosInputsFromZodSchemaOptions<TSchema> = Record<
    string,
    never
  >,
> = InputFieldsFromShape<
  AppSchemaTypes,
  PothosZodSchemaGraphqlShape<TSchema, TOptions>,
  "Arg"
>;

/** @deprecated Use `PothosInputsFromZodSchemaOptions`. */
export type PothosInputsFromZodShapeOptions<
  TShape extends ZodObjectShape = ZodObjectShape,
> = {
  exclude?: PothosInputExclude<TShape>;
  enumRegistry?: Readonly<Record<string, PothosInputFieldType>>;
  fieldTypes?: PothosFieldTypesMap<TShape>;
  required?: PothosInputsRequiredOption;
  unmappedFields?: PothosUnmappedFieldPolicy;
};

/** Widened options used inside builders (avoids `never` when generics are not inferred). */
export type PothosInputsRuntimeOptions = {
  exclude?: readonly string[];
  enumRegistry?: Readonly<Record<string, PothosInputFieldType>>;
  fieldTypes?: Record<string, PothosInputFieldType>;
  required?: PothosInputsRequiredOption;
  unmappedFields?: PothosUnmappedFieldPolicy;
};

const zodEnumGraphqlTypeOverrides = new Map<string, PothosInputFieldType>();
const namedPothosGraphqlTypeRegistry = new Map<string, PothosInputFieldType>();

export const registerNamedPothosGraphqlType = (
  name: string,
  type: PothosInputFieldType = name as PothosInputFieldType
) => {
  namedPothosGraphqlTypeRegistry.set(name, type);
};

/** Stable lookup key for a Zod enum's allowed values. */
export const zodEnumValuesKey = (
  values: readonly (string | number)[]
): string => values.map(String).toSorted().join("\0");

export const graphqlEnumRuntimeValues = (
  values:
    | Readonly<Record<string, { readonly value?: string | number }>>
    | (() => Readonly<Record<string, { readonly value?: string | number }>>)
): string[] => {
  const resolved = typeof values === "function" ? values() : values;

  return Object.entries(resolved)
    .map(([name, config]) =>
      config.value === undefined ? name : String(config.value)
    )
    .toSorted();
};

type AutoDiscoveredEnumTypesCache = {
  readonly size: number;
  readonly types: ReadonlyMap<string, string>;
};

const autoDiscoveredEnumTypesCaches = new WeakMap<
  PothosSchemaBuilder,
  AutoDiscoveredEnumTypesCache
>();

const buildAutoDiscoveredEnumTypesCache = (
  graphqlBuilder: PothosSchemaBuilder
): ReadonlyMap<string, string> => {
  const byValues = new Map<string, string>();
  const ambiguous = new Map<string, string[]>();

  for (const config of graphqlBuilder.configStore.typeConfigs.values()) {
    if (config.kind !== "Enum") {
      continue;
    }

    const valuesKey = zodEnumValuesKey(graphqlEnumRuntimeValues(config.values));
    const typeName = config.name;

    const existing = byValues.get(valuesKey);
    if (existing !== undefined && existing !== typeName) {
      const names = ambiguous.get(valuesKey) ?? [existing];
      if (!names.includes(typeName)) {
        names.push(typeName);
      }
      ambiguous.set(valuesKey, names);
      byValues.delete(valuesKey);
      continue;
    }

    if (!ambiguous.has(valuesKey)) {
      byValues.set(valuesKey, typeName);
    }
  }

  if (process.env.NODE_ENV !== "production") {
    for (const [valuesKey, names] of ambiguous) {
      console.warn(
        `[pothosInputsFromZodSchema] Ambiguous GraphQL enums for values [${valuesKey.replaceAll("\0", ", ")}]: ${names.join(", ")}. Use fieldTypes or registerZodEnumGraphqlType.`
      );
    }
  }

  return byValues;
};

const getAutoDiscoveredPothosEnumType = (
  valuesKey: string,
  graphqlBuilder: PothosSchemaBuilder
): PothosInputFieldType | undefined => {
  const typeConfigCount = graphqlBuilder.configStore.typeConfigs.size;
  const cached = autoDiscoveredEnumTypesCaches.get(graphqlBuilder);

  if (cached === undefined || cached.size !== typeConfigCount) {
    autoDiscoveredEnumTypesCaches.set(graphqlBuilder, {
      size: typeConfigCount,
      types: buildAutoDiscoveredEnumTypesCache(graphqlBuilder),
    });
  }

  const typeName = autoDiscoveredEnumTypesCaches
    .get(graphqlBuilder)
    ?.types.get(valuesKey);
  return typeName as PothosInputFieldType | undefined;
};

const resolveZodEnumGraphqlType = (
  zodEnum: z.ZodEnum,
  graphqlBuilder: PothosSchemaBuilder
): PothosInputFieldType | undefined => {
  const valuesKey = zodEnumValuesKey([...zodEnum.options]);

  return (
    zodEnumGraphqlTypeOverrides.get(valuesKey) ??
    getAutoDiscoveredPothosEnumType(valuesKey, graphqlBuilder)
  );
};

/**
 * Optional override when multiple GraphQL enums share the same Zod values, or when
 * enums are registered after the auto-discovery cache was built.
 */
export const registerZodEnumGraphqlType = (
  values: readonly (string | number)[],
  type: PothosInputFieldType,
  options?: { readonly name?: string }
) => {
  zodEnumGraphqlTypeOverrides.set(zodEnumValuesKey(values), type);

  if (options?.name !== undefined) {
    registerNamedPothosGraphqlType(options.name, type);
  }
};

export const isZodFieldOptional = (field: z.ZodType) =>
  field.safeParse(undefined).success;

export const isZodFieldGraphqlNullable = (field: z.ZodType) =>
  isZodFieldOptional(field) || field.safeParse(null).success;

export const isZodNumberInt = (field: z.ZodNumber) => field.isInt;

export const unwrapZodField = (field: z.ZodType): z.ZodType => {
  if (field instanceof z.ZodOptional) {
    return unwrapZodField(field.unwrap() as z.ZodType);
  }

  if (field instanceof z.ZodNullable) {
    return unwrapZodField(field.unwrap() as z.ZodType);
  }

  if (field instanceof z.ZodDefault) {
    return unwrapZodField(field.unwrap() as z.ZodType);
  }

  if (field instanceof z.ZodPipe) {
    const input = unwrapZodField(field.in as z.ZodType);
    if (!(input instanceof z.ZodTransform)) {
      return input;
    }

    return unwrapZodField(field.out as z.ZodType);
  }

  return field;
};

export const resolveZodObjectShape = (schema: z.ZodType): ZodObjectShape => {
  if (schema instanceof z.ZodObject) {
    return schema.shape;
  }

  if (schema instanceof z.ZodPipe) {
    return resolveZodObjectShape(schema.out as z.ZodType);
  }

  throw new Error(
    `[pothosInputsFromZodSchema] Expected a Zod object schema, received ${schema.constructor.name}.`
  );
};

const resolvePothosTypeFromMetaValue = (
  pothosType: unknown
): PothosInputFieldType | undefined => {
  if (typeof pothosType === "string") {
    return namedPothosGraphqlTypeRegistry.get(pothosType);
  }

  return pothosType as PothosInputFieldType | undefined;
};

export const readPothosTypeFromZodMeta = (
  field: z.ZodType
): PothosInputFieldType | undefined => {
  const meta = field.meta?.();
  if (meta?.pothosType !== undefined) {
    const metaType = resolvePothosTypeFromMetaValue(meta.pothosType);
    if (metaType !== undefined) {
      return metaType;
    }

    if (typeof meta.pothosType === "string") {
      throw new Error(
        `[pothosInputsFromZodSchema] Unknown GraphQL type "${meta.pothosType}" in Zod meta.pothosType. Register it on the shared Pothos builder or pass scalarTypes to initializeDrizzleGraphqlBridge(...).`
      );
    }
  }

  const unwrapped = unwrapZodField(field);
  if (unwrapped === field) {
    return;
  }

  return readPothosTypeFromZodMeta(unwrapped);
};

export const readZodFieldDescription = (
  field: z.ZodType
): string | undefined => {
  if (field.description !== undefined) {
    return field.description;
  }

  const unwrapped = unwrapZodField(field);
  if (unwrapped === field) {
    return;
  }

  return readZodFieldDescription(unwrapped);
};

export const resolveGraphqlTypeForZodField = (
  fieldKey: string,
  field: z.ZodType,
  fieldTypeOverride: PothosInputFieldType | undefined,
  enumRegistry: Readonly<Record<string, PothosInputFieldType>> | undefined,
  graphqlBuilder: PothosSchemaBuilder
):
  | PothosInputFieldType
  | "boolean"
  | "datetime"
  | "float"
  | "int"
  | "string"
  | undefined => {
  if (fieldTypeOverride !== undefined) {
    return fieldTypeOverride;
  }

  const metaType = readPothosTypeFromZodMeta(field);
  if (metaType !== undefined) {
    return metaType;
  }

  const unwrapped = unwrapZodField(field);

  if (unwrapped instanceof z.ZodBoolean) {
    return "boolean";
  }

  if (unwrapped instanceof z.ZodDate) {
    return "datetime";
  }

  if (unwrapped instanceof z.ZodNumber) {
    return isZodNumberInt(unwrapped) ? "int" : "float";
  }

  if (unwrapped instanceof z.ZodEnum) {
    return (
      enumRegistry?.[fieldKey] ??
      resolveZodEnumGraphqlType(unwrapped, graphqlBuilder)
    );
  }

  if (unwrapped instanceof z.ZodString) {
    return "string";
  }
};

export const unmappedZodFieldMessage = (
  key: string,
  field: z.ZodType,
  source = "pothosInputsFromZodSchema"
) =>
  `[${source}] Field "${key}" (${unwrapZodField(field).constructor.name}) has no GraphQL mapping. Set fieldTypes, exclude the field, or choose an unmappedFields policy.`;

const resolveUnmappedInputField = (
  t: TypeMutationFieldBuilder,
  key: string,
  field: z.ZodType,
  options: PothosInputsRuntimeOptions,
  description: string | undefined,
  required: boolean
): PothosInputField | undefined => {
  const message = unmappedZodFieldMessage(key, field);

  switch (options.unmappedFields ?? "throw") {
    case "omit":
      return;
    case "warn":
      if (process.env.NODE_ENV !== "production") {
        console.warn(`${message} Falling back to String.`);
      }
      return t.input.string({ description, required, validate: field });
    default:
      throw new Error(message);
  }
};

export const isFieldRequired = (
  key: string,
  field: z.ZodType,
  required: PothosInputsRequiredOption | undefined
) => {
  if (required instanceof Set) {
    return required.has(key);
  }

  if (typeof required === "function") {
    return required(key, field);
  }

  if (typeof required === "boolean") {
    return required;
  }

  return !isZodFieldOptional(field);
};

let mutationInputBuilder: TypeMutationFieldBuilder | undefined;

const getMutationInputBuilder = (): TypeMutationFieldBuilder => {
  mutationInputBuilder ??= new MutationFieldBuilder(
    builder
  ) as TypeMutationFieldBuilder;

  return mutationInputBuilder;
};

export const createPothosInputsFromZodSchema = (
  graphqlBuilder: PothosSchemaBuilder
) => {
  let mutationInputBuilderForInstance: TypeMutationFieldBuilder | undefined;

  const getMutationInputBuilderForInstance = (): TypeMutationFieldBuilder => {
    mutationInputBuilderForInstance ??= new MutationFieldBuilder(
      graphqlBuilder
    ) as TypeMutationFieldBuilder;

    return mutationInputBuilderForInstance;
  };

  return <
    TSchema extends z.ZodType,
    TOptions extends PothosInputsFromZodSchemaOptions<TSchema> = Record<
      string,
      never
    >,
  >(
    schema: TSchema,
    options?: TOptions
  ): PothosInputFieldsFromZodSchema<TSchema, TOptions> =>
    buildPothosInputFields(
      getMutationInputBuilderForInstance(),
      resolveZodObjectShape(schema),
      (options ?? {}) as PothosInputsRuntimeOptions,
      graphqlBuilder
    ) as PothosInputFieldsFromZodSchema<TSchema, TOptions>;
};

const buildPothosInputField = (
  t: TypeMutationFieldBuilder,
  key: string,
  field: z.ZodType,
  options: PothosInputsRuntimeOptions,
  graphqlBuilder: PothosSchemaBuilder
): PothosInputField | undefined => {
  const required = isFieldRequired(key, field, options.required);
  const validate = field;
  const description = readZodFieldDescription(field);
  const fieldTypes = options.fieldTypes ?? {};
  const graphqlType = resolveGraphqlTypeForZodField(
    key,
    field,
    fieldTypes[key],
    options.enumRegistry,
    graphqlBuilder
  );

  if (
    graphqlType !== "string" &&
    graphqlType !== "boolean" &&
    graphqlType !== "int" &&
    graphqlType !== "float" &&
    graphqlType !== "datetime" &&
    graphqlType !== undefined
  ) {
    return t.input.field({
      description,
      required,
      type: graphqlType,
      validate,
    });
  }

  if (graphqlType === "boolean") {
    return t.input.boolean({ description, required, validate });
  }

  if (graphqlType === "int") {
    return t.input.int({ description, required, validate });
  }

  if (graphqlType === "float") {
    return t.input.float({ description, required, validate });
  }

  if (graphqlType === "datetime") {
    return t.input.field({
      description,
      required,
      type: "DateTime",
      validate,
    });
  }

  if (graphqlType === undefined) {
    return resolveUnmappedInputField(
      t,
      key,
      field,
      options,
      description,
      required
    );
  }

  return t.input.string({ description, required, validate });
};

const buildPothosInputFields = (
  t: TypeMutationFieldBuilder,
  shape: ZodObjectShape,
  options: PothosInputsRuntimeOptions,
  graphqlBuilder: PothosSchemaBuilder
) => {
  const exclude = new Set(options.exclude ?? []);
  const fields: Record<string, PothosInputField> = {};

  for (const [key, field] of Object.entries(shape)) {
    if (exclude.has(key)) {
      continue;
    }

    const inputField = buildPothosInputField(
      t,
      key,
      field,
      options,
      graphqlBuilder
    );
    if (inputField !== undefined) {
      fields[key] = inputField;
    }
  }

  return fields;
};

const buildUnmappedQueryArg = (
  t: TypeQueryFieldBuilder,
  key: string,
  field: z.ZodType,
  description: string | undefined,
  policy: PothosUnmappedFieldPolicy | undefined,
  required: boolean
) => {
  const message = unmappedZodFieldMessage(
    key,
    field,
    "pothosArgsFromZodSchema"
  );

  switch (policy ?? "throw") {
    case "omit":
      return;
    case "warn":
      if (process.env.NODE_ENV !== "production") {
        console.warn(`${message} Falling back to String.`);
      }
      return t.arg.string({ description, required });
    default:
      throw new Error(message);
  }
};

const buildPothosQueryArg = (
  t: TypeQueryFieldBuilder,
  key: string,
  field: z.ZodType,
  graphqlBuilder: PothosSchemaBuilder,
  options: PothosInputsRuntimeOptions
): PothosQueryArgField | undefined => {
  const required = isFieldRequired(key, field, options.required);
  const description = readZodFieldDescription(field);
  const fieldTypes = options.fieldTypes ?? {};
  const graphqlType = resolveGraphqlTypeForZodField(
    key,
    field,
    fieldTypes[key],
    options.enumRegistry,
    graphqlBuilder
  );

  if (
    graphqlType !== undefined &&
    graphqlType !== "string" &&
    graphqlType !== "boolean" &&
    graphqlType !== "int" &&
    graphqlType !== "float" &&
    graphqlType !== "datetime"
  ) {
    return t.arg({
      description,
      required,
      type: graphqlType,
    });
  }

  if (graphqlType === "boolean") {
    return t.arg.boolean({ description, required });
  }

  if (graphqlType === "int") {
    return t.arg.int({ description, required });
  }

  if (graphqlType === "float") {
    return t.arg.float({ description, required });
  }

  if (graphqlType === "datetime") {
    return t.arg({
      description,
      required,
      type: "DateTime",
    });
  }

  if (graphqlType === undefined) {
    return buildUnmappedQueryArg(
      t,
      key,
      field,
      description,
      options.unmappedFields,
      required
    );
  }

  return t.arg.string({ description, required });
};

const buildPothosQueryArgs = (
  t: TypeQueryFieldBuilder,
  shape: ZodObjectShape,
  options: PothosInputsRuntimeOptions,
  graphqlBuilder: PothosSchemaBuilder
) => {
  const exclude = new Set(options.exclude ?? []);
  const args: Record<string, PothosQueryArgField> = {};

  for (const [key, field] of Object.entries(shape)) {
    if (exclude.has(key)) {
      continue;
    }

    const arg = buildPothosQueryArg(t, key, field, graphqlBuilder, options);
    if (arg !== undefined) {
      args[key] = arg;
    }
  }

  return args;
};

let queryArgBuilder: TypeQueryFieldBuilder | undefined;

const getQueryArgBuilder = (): TypeQueryFieldBuilder => {
  queryArgBuilder ??= new QueryFieldBuilder(builder) as TypeQueryFieldBuilder;

  return queryArgBuilder;
};

export const createPothosArgsFromZodSchema = (
  graphqlBuilder: PothosSchemaBuilder
) => {
  let queryArgBuilderForInstance: TypeQueryFieldBuilder | undefined;

  const getQueryArgBuilderForInstance = (): TypeQueryFieldBuilder => {
    queryArgBuilderForInstance ??= new QueryFieldBuilder(
      graphqlBuilder
    ) as TypeQueryFieldBuilder;

    return queryArgBuilderForInstance;
  };

  return <
    TSchema extends z.ZodType,
    TOptions extends PothosInputsFromZodSchemaOptions<TSchema> = Record<
      string,
      never
    >,
  >(
    schema: TSchema,
    options?: TOptions
  ): PothosArgsFieldsFromZodSchema<TSchema, TOptions> =>
    buildPothosQueryArgs(
      getQueryArgBuilderForInstance(),
      resolveZodObjectShape(schema),
      (options ?? {}) as PothosInputsRuntimeOptions,
      graphqlBuilder
    ) as PothosArgsFieldsFromZodSchema<TSchema, TOptions>;
};

/**
 * Maps a Zod object schema to Pothos query `args` fields.
 *
 * Accepts plain `z.object()` schemas and wrappers such as `z.preprocess()`.
 * Pass the same schema your resolver validates against — no `.shape` needed.
 */
export const pothosArgsFromZodSchema = <
  TSchema extends z.ZodType,
  TOptions extends PothosInputsFromZodSchemaOptions<TSchema> = Record<
    string,
    never
  >,
>(
  schema: TSchema,
  options?: TOptions
): PothosArgsFieldsFromZodSchema<TSchema, TOptions> =>
  buildPothosQueryArgs(
    getQueryArgBuilder(),
    resolveZodObjectShape(schema),
    (options ?? {}) as PothosInputsRuntimeOptions,
    builder
  ) as PothosArgsFieldsFromZodSchema<TSchema, TOptions>;

/**
 * Maps a Zod object schema to Pothos `withInput` fields.
 *
 * Accepts plain `z.object()` schemas and wrappers such as `z.preprocess()`.
 * Pass the same schema your service validates against — no `.shape` needed.
 */
export const pothosInputsFromZodSchema = <
  TSchema extends z.ZodType,
  TOptions extends PothosInputsFromZodSchemaOptions<TSchema> = Record<
    string,
    never
  >,
>(
  schema: TSchema,
  options?: TOptions
): PothosInputFieldsFromZodSchema<TSchema, TOptions> =>
  buildPothosInputFields(
    getMutationInputBuilder(),
    resolveZodObjectShape(schema),
    (options ?? {}) as PothosInputsRuntimeOptions,
    builder
  ) as PothosInputFieldsFromZodSchema<TSchema, TOptions>;

/** @deprecated Prefer `pothosInputsFromZodSchema(schema, options)`. */
export const pothosInputsFromZodShape = <TShape extends ZodObjectShape>(
  t: TypeMutationFieldBuilder,
  shape: TShape,
  options: PothosInputsFromZodShapeOptions<TShape> = {}
) =>
  buildPothosInputFields(
    t,
    shape,
    options as PothosInputsRuntimeOptions,
    builder
  );
