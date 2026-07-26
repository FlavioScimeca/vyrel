import type { FieldMap, GenericFieldRef, SchemaTypes } from "@pothos/core";
import { z } from "zod/v4";

import {
  createMorphConnection,
  type MorphConnectionOptions,
} from "./connection";
import { buildDrizzleGraphqlEnumRegistry } from "./drizzle-graphql-enum-registry";
import { morphWarn } from "./warn";
import {
  createPothosArgsFromZodSchema,
  createPothosInputsFromZodSchema,
  isZodFieldGraphqlNullable,
  type PothosArgsFieldsFromZodSchema,
  type PothosInputFieldsFromZodSchema,
  type PothosInputFieldType,
  type PothosInputsFromZodSchemaOptions,
  type PothosSchemaBuilder,
  type PothosUnmappedFieldPolicy,
  readZodFieldDescription,
  registerNamedPothosGraphqlType,
  resolveGraphqlTypeForZodField,
  resolveZodObjectShape,
  unmappedZodFieldMessage,
  unwrapZodField,
  type ZodSchemaKeys,
} from "./zod-pothos-inputs";

export type {
  ConnectionPageInfo,
  ConnectionPayload,
  MorphConnectionOptions,
} from "./connection";

type ExtraEnumSource = readonly (string | number)[] | z.ZodType;
type BivariantResolve<TParent> = {
  bivarianceHack: (parent: TParent) => unknown;
}["bivarianceHack"];
type ComputedEnumFieldOptions<TParent> = {
  readonly description?: string;
  readonly nullable?: boolean;
  readonly resolve: BivariantResolve<TParent>;
};

export type DefineDrizzleGraphqlFieldsConfig<
  TRowSchema extends z.ZodType = z.ZodType,
> = {
  readonly computedEnumFields?: Readonly<
    Record<string, ComputedEnumFieldOptions<z.infer<TRowSchema>>>
  >;
  readonly enumName?: (field: string, objectName: string) => string;
  readonly exclude?: readonly ZodSchemaKeys<TRowSchema>[];
  readonly extraEnums?: Readonly<Record<string, ExtraEnumSource>>;
  readonly extraEnumsFrom?: z.ZodType | readonly z.ZodType[];
  readonly idFields?: readonly string[];
  readonly listArgsSchema?: Readonly<Record<string, z.ZodType>>;
  readonly objectName: string;
  readonly rowSchema: TRowSchema;
  readonly unmappedFields?: PothosUnmappedFieldPolicy;
};

type DrizzleExposeFieldsBuilder = {
  exposeBoolean: (
    name: string,
    options: { description?: string; nullable: boolean }
  ) => GenericFieldRef<unknown>;
  exposeID: (
    name: string,
    options: { description?: string; nullable: boolean }
  ) => GenericFieldRef<unknown>;
  exposeString: (
    name: string,
    options: { description?: string; nullable: boolean }
  ) => GenericFieldRef<unknown>;
  field: (config: {
    description?: string;
    nullable: boolean;
    resolve: (parent: Record<string, unknown>) => unknown;
    type: unknown;
  }) => GenericFieldRef<unknown>;
};

type ExposeFieldsOptions<TRowSchema extends z.ZodType> = {
  readonly exclude?: readonly ZodSchemaKeys<TRowSchema>[];
  readonly fieldTypes?: Partial<
    Readonly<Record<ZodSchemaKeys<TRowSchema>, PothosInputFieldType>>
  >;
  readonly unmappedFields?: PothosUnmappedFieldPolicy;
};

type ListArgsSchemaFromConfig<T> = T extends {
  readonly listArgsSchema: infer S extends Readonly<Record<string, z.ZodType>>;
}
  ? S
  : undefined;

type NamedArgsFields<
  Types extends SchemaTypes,
  T extends Readonly<Record<string, z.ZodType>>,
> = {
  readonly [K in keyof T]: PothosArgsFieldsFromZodSchema<Types, T[K]>;
};

type DrizzleGraphqlFieldsCore<
  Types extends SchemaTypes,
  TRowSchema extends z.ZodType,
> = {
  readonly argsFrom: <
    TSchema extends z.ZodType,
    TOptions extends PothosInputsFromZodSchemaOptions<TSchema> = Record<
      string,
      never
    >,
  >(
    schema: TSchema,
    options?: TOptions
  ) => PothosArgsFieldsFromZodSchema<Types, TSchema, TOptions>;
  readonly connection: <TNodeType>(
    options: MorphConnectionOptions<TNodeType>
  ) => ReturnType<
    ReturnType<PothosSchemaBuilder<Types>["objectRef"]>["implement"]
  >;
  readonly exposeFields: <TBuilder>(
    t: TBuilder,
    options?: ExposeFieldsOptions<TRowSchema>
  ) => FieldMap;
  readonly computedEnumField: <TParent>(
    t: DrizzleExposeFieldsBuilder,
    field: string,
    options: ComputedEnumFieldOptions<TParent>
  ) => GenericFieldRef<unknown>;
  readonly inputsFrom: <
    TSchema extends z.ZodType,
    TOptions extends PothosInputsFromZodSchemaOptions<TSchema> = Record<
      string,
      never
    >,
  >(
    schema: TSchema,
    options?: TOptions
  ) => PothosInputFieldsFromZodSchema<Types, TSchema, TOptions>;
};

export type DrizzleGraphqlFields<
  Types extends SchemaTypes = SchemaTypes,
  TRowSchema extends z.ZodType = z.ZodType,
  TListArgsSchema extends
    | Readonly<Record<string, z.ZodType>>
    | undefined = undefined,
> = DrizzleGraphqlFieldsCore<Types, TRowSchema> &
  (TListArgsSchema extends Readonly<Record<string, z.ZodType>>
    ? {
        readonly args: NamedArgsFields<Types, TListArgsSchema>;
        readonly listArgsSchema: TListArgsSchema;
      }
    : Record<string, never>);

export type InitializeDrizzleGraphqlBridgeOptions = {
  readonly defaultIdFields?: readonly string[];
  readonly unmappedFields?: PothosUnmappedFieldPolicy;
};

export type DrizzleGraphqlEnumRegistryConfig = Pick<
  DefineDrizzleGraphqlFieldsConfig<z.ZodType>,
  | "enumName"
  | "extraEnums"
  | "extraEnumsFrom"
  | "listArgsSchema"
  | "objectName"
  | "rowSchema"
>;

type ModelWithListArgsSchema<
  TRowSchema extends z.ZodType = z.ZodType,
  TListArgs extends Readonly<Record<string, z.ZodType>> = Readonly<
    Record<string, z.ZodType>
  >,
> = DefineDrizzleGraphqlFieldsConfig<TRowSchema> & {
  readonly listArgsSchema: TListArgs;
  readonly rowSchema: TRowSchema;
};

export type DrizzleGraphqlBridge<Types extends SchemaTypes = SchemaTypes> = {
  readonly fields: <
    const TRowSchema extends z.ZodType,
    const TConfig extends DefineDrizzleGraphqlFieldsConfig<TRowSchema> & {
      readonly rowSchema: TRowSchema;
    },
  >(
    config: TConfig
  ) => DrizzleGraphqlFields<
    Types,
    TConfig["rowSchema"],
    ListArgsSchemaFromConfig<TConfig>
  >;
  readonly model: {
    <
      const TRowSchema extends z.ZodType,
      const TListArgs extends Readonly<Record<string, z.ZodType>>,
    >(
      config: ModelWithListArgsSchema<TRowSchema, TListArgs>
    ): DrizzleGraphqlFields<Types, typeof config.rowSchema, TListArgs>;
    <
      const TRowSchema extends z.ZodType,
      const TConfig extends DefineDrizzleGraphqlFieldsConfig<TRowSchema> & {
        readonly rowSchema: TRowSchema;
      },
    >(
      config: TConfig
    ): DrizzleGraphqlFields<
      Types,
      TConfig["rowSchema"],
      ListArgsSchemaFromConfig<TConfig>
    >;
  };
  readonly inputsFrom: <
    TSchema extends z.ZodType,
    TOptions extends PothosInputsFromZodSchemaOptions<TSchema> = Record<
      string,
      never
    >,
  >(
    schema: TSchema,
    options?: TOptions
  ) => PothosInputFieldsFromZodSchema<Types, TSchema, TOptions>;
};

const builtInGraphqlInputTypeNames = [
  "ID",
  "String",
  "Boolean",
  "Int",
  "Float",
] as const;

const registerBuilderNamedGraphqlTypes = <Types extends SchemaTypes>(
  graphqlBuilder: PothosSchemaBuilder<Types>
) => {
  for (const typeName of builtInGraphqlInputTypeNames) {
    registerNamedPothosGraphqlType(typeName);
  }

  for (const config of graphqlBuilder.configStore.typeConfigs.values()) {
    if (config.kind === "Scalar") {
      registerNamedPothosGraphqlType(config.name);
    }
  }
};

const handleUnmappedExposeField = (
  key: string,
  field: z.ZodType,
  policy: PothosUnmappedFieldPolicy | undefined
): undefined => {
  const message = unmappedZodFieldMessage(
    key,
    field,
    "defineDrizzleGraphqlFields"
  );

  switch (policy ?? "throw") {
    case "omit":
      return;
    case "warn":
      if (process.env.NODE_ENV !== "production") {
        morphWarn(`${message} Omitting field.`);
      }
      return;
    default:
      throw new Error(message);
  }
};

const exposeZodColumnField = <Types extends SchemaTypes>(
  t: DrizzleExposeFieldsBuilder,
  key: string,
  field: z.ZodType,
  graphqlBuilder: PothosSchemaBuilder<Types>,
  enumRegistry: Readonly<Record<string, PothosInputFieldType>>,
  idFields: ReadonlySet<string>,
  fieldTypeOverride: PothosInputFieldType | undefined,
  unmappedFields: PothosUnmappedFieldPolicy | undefined
): GenericFieldRef<unknown> | undefined => {
  const description = readZodFieldDescription(field);
  const nullable = isZodFieldGraphqlNullable(field);
  const unwrapped = unwrapZodField(field);
  const graphqlType = resolveGraphqlTypeForZodField(
    key,
    field,
    fieldTypeOverride,
    enumRegistry,
    graphqlBuilder
  );

  if (graphqlType === undefined) {
    return handleUnmappedExposeField(key, field, unmappedFields);
  }

  if (graphqlType === "string") {
    if (idFields.has(key) && unwrapped instanceof z.ZodString) {
      return t.exposeID(key, { description, nullable });
    }

    return t.exposeString(key, { description, nullable });
  }

  if (graphqlType === "boolean") {
    return t.exposeBoolean(key, { description, nullable });
  }

  if (graphqlType === "datetime") {
    return t.field({
      description,
      nullable,
      resolve: (row: Record<string, unknown>) => row[key],
      type: "DateTime",
    });
  }

  if (graphqlType === "int") {
    return t.field({
      description,
      nullable,
      resolve: (row: Record<string, unknown>) => row[key],
      type: "Int",
    });
  }

  if (graphqlType === "float") {
    return t.field({
      description,
      nullable,
      resolve: (row: Record<string, unknown>) => row[key],
      type: "Float",
    });
  }

  return t.field({
    description,
    nullable,
    resolve: (row: Record<string, unknown>) => row[key],
    type: graphqlType,
  });
};

const buildNamedArgsFields = <
  Types extends SchemaTypes,
  TListArgsSchema extends Readonly<Record<string, z.ZodType>>,
>(
  listArgsSchema: TListArgsSchema,
  argsFrom: DrizzleGraphqlFieldsCore<Types, z.ZodType>["argsFrom"]
): NamedArgsFields<Types, TListArgsSchema> => {
  const args: Record<string, unknown> = {};

  for (const key of Object.keys(listArgsSchema) as (keyof TListArgsSchema)[]) {
    args[key as string] = argsFrom(listArgsSchema[key]);
  }

  return args as NamedArgsFields<Types, TListArgsSchema>;
};

const createDrizzleGraphqlFields = <
  Types extends SchemaTypes,
  const TRowSchema extends z.ZodType,
  const TConfig extends DefineDrizzleGraphqlFieldsConfig<TRowSchema> & {
    readonly rowSchema: TRowSchema;
  },
>(
  graphqlBuilder: PothosSchemaBuilder<Types>,
  argsFromZodSchema: ReturnType<typeof createPothosArgsFromZodSchema<Types>>,
  inputsFromZodSchema: ReturnType<
    typeof createPothosInputsFromZodSchema<Types>
  >,
  bridgeOptions: InitializeDrizzleGraphqlBridgeOptions,
  config: TConfig
): DrizzleGraphqlFields<
  Types,
  TRowSchema,
  ListArgsSchemaFromConfig<TConfig>
> => {
  const enumRegistry = buildDrizzleGraphqlEnumRegistry(graphqlBuilder, config);
  const idFields = new Set(
    config.idFields ?? bridgeOptions.defaultIdFields ?? ["id", "orgId"]
  );
  const unmappedFields = config.unmappedFields ?? bridgeOptions.unmappedFields;

  const inputsFrom = <
    TSchema extends z.ZodType,
    TOptions extends PothosInputsFromZodSchemaOptions<TSchema> = Record<
      string,
      never
    >,
  >(
    schema: TSchema,
    options?: TOptions
  ): PothosInputFieldsFromZodSchema<Types, TSchema, TOptions> =>
    inputsFromZodSchema(schema, {
      unmappedFields,
      ...options,
      enumRegistry,
    });

  const argsFrom = <
    TSchema extends z.ZodType,
    TOptions extends PothosInputsFromZodSchemaOptions<TSchema> = Record<
      string,
      never
    >,
  >(
    schema: TSchema,
    options?: TOptions
  ): PothosArgsFieldsFromZodSchema<Types, TSchema, TOptions> =>
    argsFromZodSchema(schema, {
      unmappedFields,
      ...options,
      enumRegistry,
    });

  const exposeFields = <TBuilder>(
    t: TBuilder,
    options?: ExposeFieldsOptions<TRowSchema>
  ): FieldMap => {
    const fieldBuilder = t as DrizzleExposeFieldsBuilder;
    const exclude = new Set<string>([
      ...(config.exclude ?? []),
      ...(options?.exclude ?? []),
    ]);
    const fields: FieldMap = {};
    const fieldTypes: Partial<Record<string, PothosInputFieldType>> =
      options?.fieldTypes ?? {};
    const shape = resolveZodObjectShape(config.rowSchema);

    for (const [key, field] of Object.entries(shape)) {
      if (exclude.has(key)) {
        continue;
      }

      const exposed = exposeZodColumnField(
        fieldBuilder,
        key,
        field,
        graphqlBuilder,
        enumRegistry,
        idFields,
        fieldTypes[key],
        options?.unmappedFields ?? unmappedFields
      );
      if (exposed !== undefined) {
        fields[key] = exposed;
      }
    }

    for (const [field, fieldOptions] of Object.entries(
      config.computedEnumFields ?? {}
    )) {
      fields[field] = computedEnumField(fieldBuilder, field, fieldOptions);
    }

    return fields;
  };

  const computedEnumField = <TParent>(
    t: DrizzleExposeFieldsBuilder,
    field: string,
    options: ComputedEnumFieldOptions<TParent>
  ): GenericFieldRef<unknown> => {
    const enumType = enumRegistry[field];
    if (enumType === undefined) {
      throw new Error(
        `[defineDrizzleGraphqlFields] Missing GraphQL enum for field "${field}".`
      );
    }

    return t.field({
      description: options.description,
      nullable: options.nullable ?? false,
      resolve: options.resolve as (parent: Record<string, unknown>) => unknown,
      type: enumType,
    });
  };

  const connection = <TNodeType>(options: MorphConnectionOptions<TNodeType>) =>
    createMorphConnection(graphqlBuilder, config.objectName, options);

  const core: DrizzleGraphqlFieldsCore<Types, TRowSchema> = {
    argsFrom,
    computedEnumField,
    connection,
    exposeFields,
    inputsFrom,
  };

  if (config.listArgsSchema === undefined) {
    return core as DrizzleGraphqlFields<
      Types,
      TRowSchema,
      ListArgsSchemaFromConfig<TConfig>
    >;
  }

  return {
    ...core,
    args: buildNamedArgsFields(config.listArgsSchema, argsFrom),
    listArgsSchema: config.listArgsSchema,
  } as unknown as DrizzleGraphqlFields<
    Types,
    TRowSchema,
    ListArgsSchemaFromConfig<TConfig>
  >;
};

export const initializeDrizzleGraphqlBridge = <
  Types extends SchemaTypes = SchemaTypes,
>(
  graphqlBuilder: PothosSchemaBuilder<Types>,
  options: InitializeDrizzleGraphqlBridgeOptions = {}
): DrizzleGraphqlBridge<Types> => {
  registerBuilderNamedGraphqlTypes(graphqlBuilder);

  const inputsFrom = createPothosInputsFromZodSchema(graphqlBuilder);
  const argsFromZodSchema = createPothosArgsFromZodSchema(graphqlBuilder);

  function model<
    const TRowSchema extends z.ZodType,
    const TListArgs extends Readonly<Record<string, z.ZodType>>,
  >(
    config: ModelWithListArgsSchema<TRowSchema, TListArgs>
  ): DrizzleGraphqlFields<Types, TRowSchema, TListArgs>;
  function model<
    const TRowSchema extends z.ZodType,
    const TConfig extends DefineDrizzleGraphqlFieldsConfig<TRowSchema> & {
      readonly rowSchema: TRowSchema;
    },
  >(
    config: TConfig
  ): DrizzleGraphqlFields<Types, TRowSchema, ListArgsSchemaFromConfig<TConfig>>;
  function model<
    const TRowSchema extends z.ZodType,
    const TConfig extends DefineDrizzleGraphqlFieldsConfig<TRowSchema> & {
      readonly rowSchema: TRowSchema;
    },
  >(config: TConfig) {
    return createDrizzleGraphqlFields<Types, TRowSchema, TConfig>(
      graphqlBuilder,
      argsFromZodSchema,
      inputsFrom,
      options,
      config
    );
  }

  return {
    fields: model,
    inputsFrom,
    model,
  };
};
