import type { SchemaTypes } from "@pothos/core";
import { z } from "zod/v4";

import type { DrizzleGraphqlEnumRegistryConfig } from "./define-drizzle-graphql-fields";
import {
  graphqlEnumRuntimeValues,
  type PothosInputFieldType,
  type PothosSchemaBuilder,
  resolveZodObjectShape,
  unwrapZodField,
  zodEnumValuesKey,
} from "./zod-pothos-inputs";

type ExtraEnumSource = readonly (string | number)[] | z.ZodType;

const pascalCase = (value: string): string =>
  value.length === 0 ? value : `${value[0]?.toUpperCase()}${value.slice(1)}`;

const defaultEnumName = (field: string, objectName: string) =>
  `${objectName}${pascalCase(field)}`;

const formatEnumValues = (values: readonly (string | number)[]): string =>
  zodEnumValuesKey(values).replaceAll("\0", ", ");

const assertExistingEnumValuesMatch = (
  graphqlName: string,
  existingValues: Parameters<typeof graphqlEnumRuntimeValues>[0],
  expectedValues: readonly (string | number)[]
) => {
  const existingRuntimeValues = graphqlEnumRuntimeValues(existingValues);

  if (
    zodEnumValuesKey(existingRuntimeValues) === zodEnumValuesKey(expectedValues)
  ) {
    return;
  }

  throw new Error(
    `[defineDrizzleGraphqlFields] GraphQL enum "${graphqlName}" is already registered with values [${formatEnumValues(existingRuntimeValues)}], but this model expects [${formatEnumValues(expectedValues)}]. Use a distinct enumName/objectName or align the enum values.`
  );
};

const enumValuesFromSource = (
  field: string,
  source: ExtraEnumSource
): readonly (string | number)[] => {
  if (Array.isArray(source)) {
    return source;
  }

  const unwrapped = unwrapZodField(source as z.ZodType);
  if (unwrapped instanceof z.ZodEnum) {
    return unwrapped.options;
  }

  throw new Error(
    `[defineDrizzleGraphqlFields] extraEnums.${field} must be an array or Zod enum field, received ${unwrapped.constructor.name}.`
  );
};

const registerEnumType = <Types extends SchemaTypes>(
  graphqlBuilder: PothosSchemaBuilder<Types>,
  graphqlName: string,
  values: readonly (string | number)[]
): PothosInputFieldType => {
  const existing = graphqlBuilder.configStore.typeConfigs.get(graphqlName);
  if (existing?.kind === "Enum") {
    assertExistingEnumValuesMatch(graphqlName, existing.values, values);

    return graphqlName as PothosInputFieldType;
  }

  if (existing !== undefined) {
    throw new Error(
      `[defineDrizzleGraphqlFields] GraphQL type "${graphqlName}" is already registered as ${existing.kind}, expected Enum. Use a distinct enumName/objectName.`
    );
  }

  return graphqlBuilder.enumType(graphqlName, {
    values: [...values] as [string, ...string[]],
  });
};

const registerEnumsFromShape = <Types extends SchemaTypes>(
  graphqlBuilder: PothosSchemaBuilder<Types>,
  enumRegistry: Record<string, PothosInputFieldType>,
  enumName: (field: string, objectName: string) => string,
  objectName: string,
  schema: z.ZodType
) => {
  const shape = resolveZodObjectShape(schema);

  for (const [field, zodField] of Object.entries(shape)) {
    const unwrapped = unwrapZodField(zodField);
    if (!(unwrapped instanceof z.ZodEnum)) {
      continue;
    }

    const graphqlName = enumName(field, objectName);
    enumRegistry[field] = registerEnumType(
      graphqlBuilder,
      graphqlName,
      unwrapped.options
    );
  }
};

export const buildDrizzleGraphqlEnumRegistry = <Types extends SchemaTypes>(
  graphqlBuilder: PothosSchemaBuilder<Types>,
  config: DrizzleGraphqlEnumRegistryConfig
): Record<string, PothosInputFieldType> => {
  const enumRegistry: Record<string, PothosInputFieldType> = {};
  const enumName = config.enumName ?? defaultEnumName;

  registerEnumsFromShape(
    graphqlBuilder,
    enumRegistry,
    enumName,
    config.objectName,
    config.rowSchema
  );

  for (const [field, source] of Object.entries(config.extraEnums ?? {})) {
    const graphqlName = enumName(field, config.objectName);
    enumRegistry[field] = registerEnumType(
      graphqlBuilder,
      graphqlName,
      enumValuesFromSource(field, source)
    );
  }

  let extraEnumSchemas: readonly z.ZodType[] = [];
  if (config.extraEnumsFrom !== undefined) {
    extraEnumSchemas = Array.isArray(config.extraEnumsFrom)
      ? config.extraEnumsFrom
      : [config.extraEnumsFrom];
  }

  for (const schema of extraEnumSchemas) {
    registerEnumsFromShape(
      graphqlBuilder,
      enumRegistry,
      enumName,
      config.objectName,
      schema
    );
  }

  for (const schema of Object.values(config.listArgsSchema ?? {})) {
    registerEnumsFromShape(
      graphqlBuilder,
      enumRegistry,
      enumName,
      config.objectName,
      schema
    );
  }

  return enumRegistry;
};
