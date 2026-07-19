import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import {
  buildSchema,
  type DocumentNode,
  getNamedType,
  type GraphQLInputType,
  type GraphQLObjectType,
  type GraphQLSchema,
  type GraphQLType,
  isInputObjectType,
  isInputType,
  isIntrospectionType,
  isEnumType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  isSpecifiedScalarType,
  Kind,
  typeFromAST,
  visit,
} from "graphql";

import type {
  GraphqlClientSchemaMetadata,
  GraphqlFieldMetadata,
  GraphqlObjectMetadata,
  GraphqlTypeRef,
} from "../schema-metadata";

export interface CodegenDocumentFile {
  readonly document?: DocumentNode;
  readonly location?: string;
}

interface GraphqlFragmentSource {
  readonly exportName: string;
  readonly filePath: string;
  readonly fragmentName: string;
}

export interface GraphqlOperationSource {
  readonly document: DocumentNode;
  readonly exportName: string;
  readonly filePath: string;
  readonly operationName: string;
  readonly operationType: "mutation" | "query";
}

interface GeneratedCanonicalCollection {
  readonly entityType: string;
  readonly exportName: string;
  readonly filePath: string;
  readonly responseKey: string;
  readonly storeFieldName: string;
}

interface GeneratedCrudMutation {
  readonly collectionVariablePaths?: Readonly<
    Record<string, readonly string[]>
  >;
  readonly entityType: string;
  readonly keyField: string;
  readonly kind: "create" | "delete" | "update";
  readonly operationName: string;
  readonly responseKey: string;
}

export interface GeneratedCrudRegistry {
  readonly collections: readonly GeneratedCanonicalCollection[];
  readonly mutations: readonly GeneratedCrudMutation[];
}

export interface CollectedGraphqlSources {
  readonly fragments: readonly GraphqlFragmentSource[];
  readonly operations: readonly GraphqlOperationSource[];
}

export interface GraphqlClientCodegenConfig {
  readonly keyFields?: Readonly<Record<string, string>>;
  /** TypeScript type expressions for custom GraphQL scalars. */
  readonly scalars?: Readonly<Record<string, string>>;
}

const WHITESPACE_PATTERN = /\s+/gu;

const validateCodegenConfiguration = (
  schema: GraphQLSchema,
  configuration: GraphqlClientCodegenConfig
): void => {
  for (const [typeName, keyField] of Object.entries(
    configuration.keyFields ?? {}
  )) {
    const type = schema.getType(typeName);
    if (!isObjectType(type)) {
      throw new Error(
        `Configured cache key type "${typeName}" is not a GraphQL object.`
      );
    }
    if (!Object.hasOwn(type.getFields(), keyField)) {
      throw new Error(
        `Configured cache key "${typeName}.${keyField}" does not exist in the GraphQL schema.`
      );
    }
  }

  for (const [scalarName] of Object.entries(configuration.scalars ?? {})) {
    const type = schema.getType(scalarName);
    if (!isScalarType(type) || isSpecifiedScalarType(type)) {
      throw new Error(
        `Configured scalar "${scalarName}" is not a custom GraphQL scalar.`
      );
    }
  }

  for (const type of Object.values(schema.getTypeMap())) {
    if (
      isScalarType(type) &&
      !isSpecifiedScalarType(type) &&
      configuration.scalars?.[type.name] === undefined
    ) {
      throw new Error(
        `Custom GraphQL scalar "${type.name}" requires a TypeScript mapping in the plugin "scalars" option.`
      );
    }
  }
};

export const validateGraphqlSourceExports = (
  sources: CollectedGraphqlSources
): void => {
  const documents = [...sources.fragments, ...sources.operations];
  for (const document of documents) {
    if (!existsSync(document.filePath)) {
      continue;
    }
    const source = readFileSync(document.filePath, "utf8").replace(
      WHITESPACE_PATTERN,
      " "
    );
    const declaration = `export const ${document.exportName}`;
    const declarationIndex = source.indexOf(declaration);
    const declarationSuffix = source.at(declarationIndex + declaration.length);
    if (
      declarationIndex >= 0 &&
      (declarationSuffix === " " ||
        declarationSuffix === ":" ||
        declarationSuffix === "=")
    ) {
      continue;
    }
    const graphqlName =
      "fragmentName" in document
        ? document.fragmentName
        : document.operationName;
    throw new Error(
      `GraphQL document "${graphqlName}" in "${document.filePath}" must be exported as "${document.exportName}".`
    );
  }
};

const toTypeRef = (type: GraphQLType): GraphqlTypeRef => {
  if (isNonNullType(type)) {
    return { kind: "NON_NULL", ofType: toTypeRef(type.ofType) };
  }
  if (isListType(type)) {
    return { kind: "LIST", ofType: toTypeRef(type.ofType) };
  }
  return { kind: "NAMED", name: type.name };
};

const toObjectMetadata = (
  type: GraphQLObjectType,
  keyFields: GraphqlClientCodegenConfig["keyFields"]
): GraphqlObjectMetadata => {
  const configuredKeyField = keyFields?.[type.name];
  const fields: Record<string, GraphqlFieldMetadata> = {};
  for (const [fieldName, field] of Object.entries(type.getFields())) {
    fields[fieldName] = { type: toTypeRef(field.type) };
  }
  if (
    configuredKeyField !== undefined &&
    !Object.hasOwn(fields, configuredKeyField)
  ) {
    throw new Error(
      `Configured cache key "${type.name}.${configuredKeyField}" does not exist in the GraphQL schema.`
    );
  }
  return {
    fields,
    keyFields:
      configuredKeyField === undefined
        ? Object.hasOwn(fields, "id")
          ? ["id"]
          : []
        : [configuredKeyField],
  };
};

const createGraphqlClientMetadataFromSchema = (
  schema: GraphQLSchema,
  configuration: GraphqlClientCodegenConfig = {}
): GraphqlClientSchemaMetadata => {
  validateCodegenConfiguration(schema, configuration);
  const enums: Record<string, readonly string[]> = {};
  const types: Record<string, GraphqlObjectMetadata> = {};
  for (const type of Object.values(schema.getTypeMap())) {
    if (isIntrospectionType(type)) {
      continue;
    }
    if (isEnumType(type)) {
      enums[type.name] = type.getValues().map(({ name }) => name);
      continue;
    }
    if (
      isSpecifiedScalarType(type) ||
      !isObjectType(type)
    ) {
      continue;
    }
    types[type.name] = toObjectMetadata(type, configuration.keyFields);
  }
  return {
    enums,
    mutationType: schema.getMutationType()?.name,
    queryType: schema.getQueryType()?.name,
    types,
  };
};

export const createGraphqlClientMetadata = (
  schemaSource: string,
  configuration: GraphqlClientCodegenConfig = {}
): GraphqlClientSchemaMetadata =>
  createGraphqlClientMetadataFromSchema(
    buildSchema(schemaSource),
    configuration
  );

const capitalize = (value: string): string =>
  `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

export const collectGraphqlSources = (
  documents: readonly CodegenDocumentFile[]
): CollectedGraphqlSources => {
  const fragments = new Map<string, GraphqlFragmentSource>();
  const operations = new Map<string, GraphqlOperationSource>();

  for (const source of documents) {
    if (source.document === undefined || source.location === undefined) {
      continue;
    }
    const filePath = resolve(source.location);
    for (const definition of source.document.definitions) {
      if (definition.kind === Kind.FRAGMENT_DEFINITION) {
        const fragmentName = definition.name.value;
        if (fragments.has(fragmentName)) {
          throw new Error(`Fragment "${fragmentName}" is declared more than once.`);
        }
        fragments.set(fragmentName, {
          exportName: `${fragmentName}Fragment`,
          filePath,
          fragmentName,
        });
        continue;
      }
      if (
        definition.kind !== Kind.OPERATION_DEFINITION ||
        definition.name === undefined ||
        (definition.operation.toString() !== "mutation" &&
          definition.operation.toString() !== "query")
      ) {
        continue;
      }
      const operationName = definition.name.value;
      if (operations.has(operationName)) {
        throw new Error(`Operation "${operationName}" is declared more than once.`);
      }
      operations.set(operationName, {
        document: source.document,
        exportName: `${operationName}Document`,
        filePath,
        operationName,
        operationType: definition.operation.toString() as "mutation" | "query",
      });
    }
  }

  return {
    fragments: [...fragments.values()].toSorted((left, right) =>
      left.fragmentName.localeCompare(right.fragmentName)
    ),
    operations: [...operations.values()].toSorted((left, right) =>
      left.operationName.localeCompare(right.operationName)
    ),
  };
};

const getOperationDefinition = (operation: GraphqlOperationSource) => {
  const definition = operation.document.definitions.find(
    (candidate) =>
      candidate.kind === Kind.OPERATION_DEFINITION &&
      candidate.name?.value === operation.operationName
  );
  if (definition?.kind !== Kind.OPERATION_DEFINITION) {
    throw new Error(`Could not read operation "${operation.operationName}".`);
  }
  return definition;
};

const getSingleRootField = (operation: GraphqlOperationSource) => {
  const fields = getOperationDefinition(operation).selectionSet.selections.filter(
    (selection) => selection.kind === Kind.FIELD
  );
  return fields.length === 1 ? fields[0] : undefined;
};

const getListEntityType = (
  schema: GraphQLSchema,
  operation: GraphqlOperationSource
): string | undefined => {
  const rootField = getSingleRootField(operation);
  const schemaField = rootField
    ? schema.getQueryType()?.getFields()[rootField.name.value]
    : undefined;
  if (schemaField === undefined) {
    return;
  }
  const nullableType = isNonNullType(schemaField.type)
    ? schemaField.type.ofType
    : schemaField.type;
  if (!isListType(nullableType)) {
    return;
  }
  const entityType = getNamedType(nullableType.ofType);
  return isObjectType(entityType) ? entityType.name : undefined;
};

const selectCanonicalCollection = (
  entityType: string,
  candidates: readonly GraphqlOperationSource[]
): GraphqlOperationSource => {
  if (candidates.length === 1 && candidates[0]) {
    return candidates[0];
  }
  const conventional = candidates.filter((candidate) => {
    const field = getSingleRootField(candidate);
    return (
      field !== undefined &&
      candidate.operationName === `List${capitalize(field.name.value)}`
    );
  });
  if (conventional.length === 1 && conventional[0]) {
    return conventional[0];
  }
  throw new Error(
    `Type "${entityType}" has multiple list queries and no unique canonical List<Field> operation.`
  );
};

const areBindableInputTypes = (
  source: GraphQLInputType,
  target: GraphQLInputType
): boolean => {
  const sourceType = getNamedType(source);
  const targetType = getNamedType(target);
  if (sourceType.name === targetType.name) {
    return true;
  }
  const isStringLike = (name: string): boolean =>
    name === "ID" || name === "String";
  return (
    isScalarType(sourceType) &&
    isScalarType(targetType) &&
    isStringLike(sourceType.name) &&
    isStringLike(targetType.name)
  );
};

const findNestedVariablePaths = (
  inputType: GraphQLInputType,
  targetName: string,
  targetType: GraphQLInputType,
  path: readonly string[],
  visited: ReadonlySet<string>
): string[][] => {
  const namedType = getNamedType(inputType);
  if (!isInputObjectType(namedType) || visited.has(namedType.name)) {
    return [];
  }
  const nextVisited = new Set(visited).add(namedType.name);
  const fields = namedType.getFields();
  const paths: string[][] = [];
  const matchingField = fields[targetName];
  if (matchingField && areBindableInputTypes(matchingField.type, targetType)) {
    paths.push([...path, targetName]);
  }
  for (const field of Object.values(fields)) {
    paths.push(
      ...findNestedVariablePaths(
        field.type,
        targetName,
        targetType,
        [...path, field.name],
        nextVisited
      )
    );
  }
  return paths;
};

const inferVariablePaths = (
  schema: GraphQLSchema,
  collection: GraphqlOperationSource,
  mutation: GraphqlOperationSource,
  mutationResponseKey: string
): Readonly<Record<string, readonly string[]>> => {
  const collectionVariables =
    getOperationDefinition(collection).variableDefinitions ?? [];
  const allMutationVariables =
    getOperationDefinition(mutation).variableDefinitions ?? [];
  const rootField = getOperationDefinition(
    mutation
  ).selectionSet.selections.find(
    (selection) =>
      selection.kind === Kind.FIELD &&
      (selection.alias?.value ?? selection.name.value) === mutationResponseKey
  );
  if (rootField?.kind !== Kind.FIELD) {
    throw new Error(
      `Could not find mutation response field "${mutation.operationName}.${mutationResponseKey}".`
    );
  }
  const usedVariables = new Set<string>();
  visit(rootField, {
    Variable: ({ name }) => {
      usedVariables.add(name.value);
    },
  });
  const mutationVariables = allMutationVariables.filter(({ variable }) =>
    usedVariables.has(variable.name.value)
  );
  const paths: Record<string, readonly string[]> = {};

  for (const collectionVariable of collectionVariables) {
    const name = collectionVariable.variable.name.value;
    const targetType = typeFromAST(schema, collectionVariable.type);
    if (targetType === undefined || !isInputType(targetType)) {
      continue;
    }
    const candidates: string[][] = [];
    for (const mutationVariable of mutationVariables) {
      const mutationName = mutationVariable.variable.name.value;
      const mutationType = typeFromAST(schema, mutationVariable.type);
      if (mutationType === undefined || !isInputType(mutationType)) {
        continue;
      }
      if (mutationName === name && areBindableInputTypes(mutationType, targetType)) {
        candidates.push([mutationName]);
      }
      candidates.push(
        ...findNestedVariablePaths(
          mutationType,
          name,
          targetType,
          [mutationName],
          new Set()
        )
      );
    }
    const unique = candidates.filter(
      (candidate, index) =>
        candidates.findIndex(
          (other) => other.join(".") === candidate.join(".")
        ) === index
    );
    if (unique.length === 1 && unique[0]) {
      paths[name] = unique[0];
      continue;
    }
    if (unique.length === 0 && collectionVariable.type.kind !== Kind.NON_NULL_TYPE) {
      continue;
    }
    throw new Error(
      `Cannot uniquely bind collection variable "${name}" from mutation "${mutation.operationName}".`
    );
  }
  return paths;
};

const getEntityKeyField = (
  schema: GraphQLSchema,
  entityType: string,
  configuration: GraphqlClientCodegenConfig
): string => {
  const configured = configuration.keyFields?.[entityType];
  if (configured !== undefined) {
    return configured;
  }
  const type = schema.getType(entityType);
  if (isObjectType(type) && Object.hasOwn(type.getFields(), "id")) {
    return "id";
  }
  throw new Error(
    `GraphQL type "${entityType}" has no default "id" field. Configure its cache key through the plugin "keyFields" option.`
  );
};

const inferCrudMutations = (
  schema: GraphQLSchema,
  operation: GraphqlOperationSource,
  configuration: GraphqlClientCodegenConfig
): GeneratedCrudMutation[] => {
  const mutations: GeneratedCrudMutation[] = [];
  const rootFields = getOperationDefinition(
    operation
  ).selectionSet.selections.filter((selection) => selection.kind === Kind.FIELD);

  for (const rootField of rootFields) {
    const fieldName = rootField.name.value;
    const kind = (["create", "delete", "update"] as const).find((prefix) =>
      fieldName.startsWith(prefix)
    );
    if (kind === undefined) {
      continue;
    }
    const schemaField = schema.getMutationType()?.getFields()[fieldName];
    if (schemaField === undefined) {
      continue;
    }
    const returnType = getNamedType(schemaField.type);
    const entityType = isObjectType(returnType)
      ? returnType.name
      : capitalize(fieldName.slice(kind.length));
    if (!isObjectType(schema.getType(entityType))) {
      continue;
    }
    mutations.push({
      entityType,
      keyField: getEntityKeyField(schema, entityType, configuration),
      kind,
      operationName: operation.operationName,
      responseKey: rootField.alias?.value ?? fieldName,
    });
  }

  return mutations;
};

const createGeneratedCrudRegistryFromSchema = (
  schema: GraphQLSchema,
  operations: readonly GraphqlOperationSource[],
  configuration: GraphqlClientCodegenConfig = {}
): GeneratedCrudRegistry => {
  const candidates = new Map<string, GraphqlOperationSource[]>();
  for (const operation of operations) {
    if (operation.operationType !== "query") {
      continue;
    }
    const entityType = getListEntityType(schema, operation);
    if (entityType === undefined) {
      continue;
    }
    candidates.set(entityType, [
      ...(candidates.get(entityType) ?? []),
      operation,
    ]);
  }
  const canonical = new Map<string, GraphqlOperationSource>();
  for (const [entityType, entityCandidates] of candidates) {
    canonical.set(
      entityType,
      selectCanonicalCollection(entityType, entityCandidates)
    );
  }
  const mutations = operations.flatMap((operation) => {
    if (operation.operationType !== "mutation") {
      return [];
    }
    return inferCrudMutations(schema, operation, configuration);
  });
  const operationByName = new Map(
    operations.map((operation) => [operation.operationName, operation])
  );
  const collections = [...canonical].map(
    ([entityType, operation]): GeneratedCanonicalCollection => {
      const field = getSingleRootField(operation);
      if (field === undefined) {
        throw new Error(
          `Canonical collection "${operation.operationName}" must select one root field.`
        );
      }
      return {
        entityType,
        exportName: operation.exportName,
        filePath: operation.filePath,
        responseKey: field.alias?.value ?? field.name.value,
        storeFieldName: field.name.value,
      };
    }
  );
  const collectionByType = new Map(
    collections.map((collection) => [collection.entityType, collection])
  );
  const mutationsWithBindings = mutations.map((mutation) => {
    if (mutation.kind !== "create") {
      return mutation;
    }
    const collection = canonical.get(mutation.entityType);
    const mutationOperation = operationByName.get(mutation.operationName);
    if (collection === undefined || mutationOperation === undefined) {
      throw new Error(
        `Create mutation "${mutation.operationName}" has no canonical collection for GraphQL type "${mutation.entityType}".`
      );
    }
    if (collectionByType.get(mutation.entityType) === undefined) {
      throw new Error(
        `Could not build the canonical collection for GraphQL type "${mutation.entityType}".`
      );
    }
    return {
      ...mutation,
      collectionVariablePaths: inferVariablePaths(
        schema,
        collection,
        mutationOperation,
        mutation.responseKey
      ),
    };
  });
  return {
    collections: collections.toSorted((left, right) =>
      left.entityType.localeCompare(right.entityType)
    ),
    mutations: mutationsWithBindings.toSorted((left, right) => {
      const operationOrder = left.operationName.localeCompare(
        right.operationName
      );
      return operationOrder === 0
        ? left.responseKey.localeCompare(right.responseKey)
        : operationOrder;
    }),
  };
};

export const createGeneratedCrudRegistry = (
  schemaSource: string,
  operations: readonly GraphqlOperationSource[],
  configuration: GraphqlClientCodegenConfig = {}
): GeneratedCrudRegistry =>
  createGeneratedCrudRegistryFromSchema(
    buildSchema(schemaSource),
    operations,
    configuration
  );

const renderGraphqlClientMetadata = (
  metadata: GraphqlClientSchemaMetadata,
  fragments: readonly GraphqlFragmentSource[],
  outputPath: string,
  crudRegistry: GeneratedCrudRegistry,
  configuration: GraphqlClientCodegenConfig = {}
): string => {
  const toImportPath = (filePath: string): string => {
    const importPath = relative(dirname(outputPath), filePath)
      .split(sep)
      .join("/")
      .replace(/\.(?:[cm]?[jt]sx?)$/u, "");
    return importPath.startsWith(".") ? importPath : `./${importPath}`;
  };
  const fragmentImports = fragments
    .map(
      (fragment, index) =>
        `import type { ${fragment.exportName} as FragmentDocument${index} } from "${toImportPath(fragment.filePath)}";`
    )
    .join("\n");
  const collectionImports = crudRegistry.collections
    .map(
      (collection, index) =>
        `import { ${collection.exportName} as CollectionDocument${index} } from "${toImportPath(collection.filePath)}";`
    )
    .join("\n");
  const fragmentRegistry = fragments
    .map(
      (fragment, index) =>
        `    readonly ${JSON.stringify(fragment.fragmentName)}: ResultOf<typeof FragmentDocument${index}>;`
    )
    .join("\n");
  const collectionIndexByEntityType = new Map(
    crudRegistry.collections.map((collection, index) => [
      collection.entityType,
      index,
    ])
  );
  const collectionIndexesByMutationField = new Map<string, Set<number>>();
  for (const mutation of crudRegistry.mutations) {
    const collectionIndex = collectionIndexByEntityType.get(
      mutation.entityType
    );
    if (collectionIndex === undefined) {
      continue;
    }
    const indexes =
      collectionIndexesByMutationField.get(mutation.responseKey) ??
      new Set<number>();
    indexes.add(collectionIndex);
    collectionIndexesByMutationField.set(mutation.responseKey, indexes);
  }
  const mutationCollectionVariablesRegistry = [
    ...collectionIndexesByMutationField,
  ]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([responseKey, indexes]) => {
      const variables = [...indexes]
        .toSorted((left, right) => left - right)
        .map(
          (index) =>
            `GqlVariablesOf<typeof CollectionDocument${index}>`
        )
        .join(" | ");
      return `    readonly ${JSON.stringify(responseKey)}: ${variables};`;
    })
    .join("\n");
  const collectionRegistry = crudRegistry.collections
    .map(
      (collection, index) =>
        `    ${JSON.stringify(collection.entityType)}: { query: CollectionDocument${index}, responseKey: ${JSON.stringify(collection.responseKey)}, storeFieldName: ${JSON.stringify(collection.storeFieldName)} },`
    )
    .join("\n");
  const mutationsByOperation = new Map<string, GeneratedCrudMutation[]>();
  for (const mutation of crudRegistry.mutations) {
    mutationsByOperation.set(mutation.operationName, [
      ...(mutationsByOperation.get(mutation.operationName) ?? []),
      mutation,
    ]);
  }
  const mutationRegistry = [...mutationsByOperation]
    .map(([operationName, mutations]) => {
      const fields = mutations
        .map(
          (mutation) =>
            `      ${JSON.stringify(mutation.responseKey)}: ${JSON.stringify({ collectionVariablePaths: mutation.collectionVariablePaths, entityType: mutation.entityType, keyField: mutation.keyField, kind: mutation.kind })},`
        )
        .join("\n");
      return `    ${JSON.stringify(operationName)}: {\n${fields}\n    },`;
    })
    .join("\n");
  const scalarTypes = Object.entries(configuration.scalars ?? {})
    .map(
      ([name, type]) => `  readonly ${JSON.stringify(name)}: ${type};`
    )
    .join("\n");
  const typePolicies = Object.entries(metadata.types)
    .flatMap(([typeName, type]) =>
      type.keyFields.length === 0
        ? []
        : [
            `  ${JSON.stringify(typeName)}: { keyFields: ${JSON.stringify(type.keyFields)} },`,
          ]
    )
    .join("\n");

  return `import { defineGraphqlClientRegistry } from "@vyrel/graphql-client/cache";
import type { GraphqlClientSchemaMetadata, ModelOf } from "@vyrel/graphql-client/codegen";
import type { ResultOf, VariablesOf as GqlVariablesOf } from "gql.tada";
${fragmentImports}
${collectionImports}

declare module "@vyrel/graphql-client" {
  interface FragmentTypeRegistry {
${fragmentRegistry}
  }

  interface MutationCollectionVariablesRegistry {
${mutationCollectionVariablesRegistry}
  }
}

export const graphqlClientSchema = ${JSON.stringify(metadata, null, 2)} as const satisfies GraphqlClientSchemaMetadata;

export interface GraphqlClientScalars {
${scalarTypes}
}

export type GraphqlClientModel<TName extends keyof typeof graphqlClientSchema.types> = ModelOf<typeof graphqlClientSchema, TName, GraphqlClientScalars>;

export const graphqlClientTypePolicies = {
${typePolicies}
} as const;

export const graphqlClientRegistry = defineGraphqlClientRegistry({
  collections: {
${collectionRegistry}
  },
  mutations: {
${mutationRegistry}
  },
});
`;
};

export const generateGraphqlClientArtifact = (
  schema: GraphQLSchema,
  documents: readonly CodegenDocumentFile[],
  outputPath: string,
  configuration: GraphqlClientCodegenConfig = {}
): string => {
  const sources = collectGraphqlSources(documents);
  validateGraphqlSourceExports(sources);
  return renderGraphqlClientMetadata(
    createGraphqlClientMetadataFromSchema(schema, configuration),
    sources.fragments,
    outputPath,
    createGeneratedCrudRegistryFromSchema(
      schema,
      sources.operations,
      configuration
    ),
    configuration
  );
};
