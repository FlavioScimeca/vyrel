import type { FieldMap, GenericFieldRef } from '@pothos/core';
import { z } from 'zod/v4';

import { builder as defaultBuilder } from '../pothos';
import { buildDrizzleGraphqlEnumRegistry } from './drizzle-graphql-enum-registry';
import {
  createPothosArgsFromZodSchema,
  createPothosInputsFromZodSchema,
  isZodFieldGraphqlNullable,
  type PothosArgsFieldsFromZodSchema,
  type PothosInputFieldsFromZodSchema,
  type PothosInputFieldType,
  type PothosInputsFromZodSchemaOptions,
  type PothosUnmappedFieldPolicy,
  readZodFieldDescription,
  registerNamedPothosGraphqlType,
  resolveGraphqlTypeForZodField,
  resolveZodObjectShape,
  unmappedZodFieldMessage,
  unwrapZodField,
  type ZodSchemaKeys,
} from './zod-pothos-inputs';

type PothosSchemaBuilder = typeof defaultBuilder;
type ExtraEnumSource = readonly (string | number)[] | z.ZodType;
type BivariantResolve<TParent> = {
  bivarianceHack(parent: TParent): unknown;
}['bivarianceHack'];
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

type NamedArgsFields<T extends Readonly<Record<string, z.ZodType>>> = {
  readonly [K in keyof T]: PothosArgsFieldsFromZodSchema<T[K]>;
};

type DrizzleGraphqlFieldsCore<TRowSchema extends z.ZodType> = {
  readonly argsFrom: <
    TSchema extends z.ZodType,
    TOptions extends PothosInputsFromZodSchemaOptions<TSchema> = Record<
      string,
      never
    >,
  >(
    schema: TSchema,
    options?: TOptions
  ) => PothosArgsFieldsFromZodSchema<TSchema, TOptions>;
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
  ) => PothosInputFieldsFromZodSchema<TSchema, TOptions>;
};

export type DrizzleGraphqlFields<
  TRowSchema extends z.ZodType = z.ZodType,
  TListArgsSchema extends
    | Readonly<Record<string, z.ZodType>>
    | undefined = undefined,
> = DrizzleGraphqlFieldsCore<TRowSchema> &
  (TListArgsSchema extends Readonly<Record<string, z.ZodType>>
    ? {
        readonly args: NamedArgsFields<TListArgsSchema>;
        readonly listArgsSchema: TListArgsSchema;
      }
    : Record<string, never>);

export type InitializeDrizzleGraphqlBridgeOptions = {
  readonly defaultEnumName?: (field: string, objectName: string) => string;
  readonly defaultIdFields?: readonly string[];
  readonly scalarTypes?: readonly PothosInputFieldType[];
  readonly unmappedFields?: PothosUnmappedFieldPolicy;
};

export type DrizzleGraphqlEnumRegistryConfig = Pick<
  DefineDrizzleGraphqlFieldsConfig<z.ZodType>,
  | 'enumName'
  | 'extraEnums'
  | 'extraEnumsFrom'
  | 'listArgsSchema'
  | 'objectName'
  | 'rowSchema'
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

export type DrizzleGraphqlBridge = {
  readonly fields: <
    const TRowSchema extends z.ZodType,
    const TConfig extends DefineDrizzleGraphqlFieldsConfig<TRowSchema> & {
      readonly rowSchema: TRowSchema;
    },
  >(
    config: TConfig
  ) => DrizzleGraphqlFields<
    TConfig['rowSchema'],
    ListArgsSchemaFromConfig<TConfig>
  >;
  readonly model: {
    <
      const TRowSchema extends z.ZodType,
      const TListArgs extends Readonly<Record<string, z.ZodType>>,
    >(
      config: ModelWithListArgsSchema<TRowSchema, TListArgs>
    ): DrizzleGraphqlFields<typeof config.rowSchema, TListArgs>;
    <
      const TRowSchema extends z.ZodType,
      const TConfig extends DefineDrizzleGraphqlFieldsConfig<TRowSchema> & {
        readonly rowSchema: TRowSchema;
      },
    >(
      config: TConfig
    ): DrizzleGraphqlFields<
      TConfig['rowSchema'],
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
  ) => PothosInputFieldsFromZodSchema<TSchema, TOptions>;
};

const builtInGraphqlInputTypeNames = [
  'ID',
  'String',
  'Boolean',
  'Int',
  'Float',
] as const;

const registerBuilderNamedGraphqlTypes = (
  graphqlBuilder: PothosSchemaBuilder,
  scalarTypes: readonly PothosInputFieldType[] | undefined
) => {
  for (const typeName of builtInGraphqlInputTypeNames) {
    registerNamedPothosGraphqlType(typeName);
  }

  for (const config of graphqlBuilder.configStore.typeConfigs.values()) {
    if (config.kind === 'Scalar') {
      registerNamedPothosGraphqlType(config.name);
    }
  }

  for (const typeName of scalarTypes ?? []) {
    if (typeof typeName === 'string') {
      registerNamedPothosGraphqlType(typeName);
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
    'defineDrizzleGraphqlFields'
  );

  switch (policy ?? 'throw') {
    case 'omit':
      return;
    case 'warn':
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`${message} Omitting field.`);
      }
      return;
    default:
      throw new Error(message);
  }
};

const exposeZodColumnField = (
  t: DrizzleExposeFieldsBuilder,
  key: string,
  field: z.ZodType,
  graphqlBuilder: PothosSchemaBuilder,
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

  if (graphqlType === 'string') {
    if (idFields.has(key) && unwrapped instanceof z.ZodString) {
      return t.exposeID(key, { description, nullable });
    }

    return t.exposeString(key, { description, nullable });
  }

  if (graphqlType === 'boolean') {
    return t.exposeBoolean(key, { description, nullable });
  }

  if (graphqlType === 'datetime') {
    return t.field({
      description,
      type: 'DateTime',
      resolve: (row: Record<string, unknown>) => row[key],
      nullable,
    });
  }

  if (graphqlType === 'int') {
    return t.field({
      description,
      type: 'Int',
      resolve: (row: Record<string, unknown>) => row[key],
      nullable,
    });
  }

  if (graphqlType === 'float') {
    return t.field({
      description,
      type: 'Float',
      resolve: (row: Record<string, unknown>) => row[key],
      nullable,
    });
  }

  return t.field({
    description,
    type: graphqlType,
    resolve: (row: Record<string, unknown>) => row[key],
    nullable,
  });
};

const buildNamedArgsFields = <
  TListArgsSchema extends Readonly<Record<string, z.ZodType>>,
>(
  listArgsSchema: TListArgsSchema,
  argsFrom: DrizzleGraphqlFieldsCore<z.ZodType>['argsFrom']
): NamedArgsFields<TListArgsSchema> => {
  const args: Record<string, unknown> = {};

  for (const key of Object.keys(listArgsSchema) as (keyof TListArgsSchema)[]) {
    args[key as string] = argsFrom(listArgsSchema[key]);
  }

  return args as NamedArgsFields<TListArgsSchema>;
};

const createDrizzleGraphqlFields = <
  const TRowSchema extends z.ZodType,
  const TConfig extends DefineDrizzleGraphqlFieldsConfig<TRowSchema> & {
    readonly rowSchema: TRowSchema;
  },
>(
  graphqlBuilder: PothosSchemaBuilder,
  argsFromZodSchema: ReturnType<typeof createPothosArgsFromZodSchema>,
  inputsFromZodSchema: ReturnType<typeof createPothosInputsFromZodSchema>,
  bridgeOptions: InitializeDrizzleGraphqlBridgeOptions,
  config: TConfig
): DrizzleGraphqlFields<TRowSchema, ListArgsSchemaFromConfig<TConfig>> => {
  const enumRegistry = buildDrizzleGraphqlEnumRegistry(
    graphqlBuilder,
    bridgeOptions,
    config
  );
  const idFields = new Set(
    config.idFields ?? bridgeOptions.defaultIdFields ?? ['id', 'orgId']
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
  ): PothosInputFieldsFromZodSchema<TSchema, TOptions> =>
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
  ): PothosArgsFieldsFromZodSchema<TSchema, TOptions> =>
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

  const core: DrizzleGraphqlFieldsCore<TRowSchema> = {
    argsFrom,
    computedEnumField,
    exposeFields,
    inputsFrom,
  };

  if (config.listArgsSchema === undefined) {
    return core as DrizzleGraphqlFields<
      TRowSchema,
      ListArgsSchemaFromConfig<TConfig>
    >;
  }

  return {
    ...core,
    args: buildNamedArgsFields(config.listArgsSchema, argsFrom),
    listArgsSchema: config.listArgsSchema,
  } as unknown as DrizzleGraphqlFields<
    TRowSchema,
    ListArgsSchemaFromConfig<TConfig>
  >;
};

export const initializeDrizzleGraphqlBridge = (
  graphqlBuilder: PothosSchemaBuilder,
  options: InitializeDrizzleGraphqlBridgeOptions = {}
): DrizzleGraphqlBridge => {
  registerBuilderNamedGraphqlTypes(graphqlBuilder, options.scalarTypes);

  const inputsFrom = createPothosInputsFromZodSchema(graphqlBuilder);
  const argsFromZodSchema = createPothosArgsFromZodSchema(graphqlBuilder);

  function model<
    const TRowSchema extends z.ZodType,
    const TListArgs extends Readonly<Record<string, z.ZodType>>,
  >(
    config: ModelWithListArgsSchema<TRowSchema, TListArgs>
  ): DrizzleGraphqlFields<TRowSchema, TListArgs>;
  function model<
    const TRowSchema extends z.ZodType,
    const TConfig extends DefineDrizzleGraphqlFieldsConfig<TRowSchema> & {
      readonly rowSchema: TRowSchema;
    },
  >(
    config: TConfig
  ): DrizzleGraphqlFields<TRowSchema, ListArgsSchemaFromConfig<TConfig>>;
  function model<
    const TRowSchema extends z.ZodType,
    const TConfig extends DefineDrizzleGraphqlFieldsConfig<TRowSchema> & {
      readonly rowSchema: TRowSchema;
    },
  >(config: TConfig) {
    return createDrizzleGraphqlFields(
      graphqlBuilder,
      argsFromZodSchema,
      inputsFrom,
      options,
      config
    );
  }

  return {
    fields: model,
    model,
    inputsFrom,
  };
};

const defaultDrizzleGraphqlBridge =
  initializeDrizzleGraphqlBridge(defaultBuilder);

/**
 * Defines GraphQL enums, drizzle object exposes, mutation inputs, and query args
 * from Zod schemas for a single Drizzle-backed model.
 */
export const defineDrizzleGraphqlFields = <
  const TRowSchema extends z.ZodType,
  const TConfig extends DefineDrizzleGraphqlFieldsConfig<TRowSchema> & {
    readonly rowSchema: TRowSchema;
  },
>(
  config: TConfig
): DrizzleGraphqlFields<
  TConfig['rowSchema'],
  ListArgsSchemaFromConfig<TConfig>
> => defaultDrizzleGraphqlBridge.fields(config);
