import { type DocumentNode, Kind, type OperationDefinitionNode } from "graphql";

type SupportedOperation = "mutation" | "query";

export const getOperationName = (
  document: DocumentNode,
  operation: SupportedOperation
): string => {
  const definitions: OperationDefinitionNode[] = [];
  for (const definition of document.definitions) {
    if (
      definition.kind === Kind.OPERATION_DEFINITION &&
      definition.operation.toString() === operation
    ) {
      definitions.push(definition);
    }
  }

  if (definitions.length !== 1 || definitions[0]?.name === undefined) {
    throw new Error(
      `Expected exactly one named GraphQL ${describeOperation(operation)}.`
    );
  }

  return definitions[0].name.value;
};

const describeOperation = (operation: SupportedOperation): string =>
  operation === "mutation" ? "mutation" : "query";

export const getRootResponseKey = (
  document: DocumentNode,
  operation: SupportedOperation,
  explicitField?: string
): string => {
  const definition = document.definitions.find(
    (candidate) =>
      candidate.kind === Kind.OPERATION_DEFINITION &&
      candidate.operation.toString() === operation
  );

  if (definition?.kind !== Kind.OPERATION_DEFINITION) {
    throw new Error(
      `Expected a GraphQL ${describeOperation(operation)} document.`
    );
  }

  const fields = definition.selectionSet.selections.filter(
    (selection) => selection.kind === Kind.FIELD
  );

  if (explicitField !== undefined) {
    const selectedField = fields.find(
      (candidateField) =>
        candidateField.name.value === explicitField ||
        candidateField.alias?.value === explicitField
    );

    if (selectedField === undefined) {
      throw new Error(
        `The field "${explicitField}" is not selected by the GraphQL ${describeOperation(operation)}.`
      );
    }

    return selectedField.alias?.value ?? selectedField.name.value;
  }

  if (fields.length !== 1) {
    throw new Error(
      `Expected exactly one top-level field in the GraphQL ${describeOperation(operation)}. Pass "field" when the operation has more than one.`
    );
  }

  const [field] = fields;
  if (field === undefined) {
    throw new Error(
      `Expected one top-level field in the GraphQL ${describeOperation(operation)}.`
    );
  }

  return field.alias?.value ?? field.name.value;
};

export interface MutationEntitySelection {
  readonly fields: ReadonlySet<string>;
  readonly typename: string;
}

export const getMutationEntitySelection = (
  document: DocumentNode,
  explicitField?: string
): MutationEntitySelection => {
  const responseKey = getRootResponseKey(document, "mutation", explicitField);
  const operation = document.definitions.find(
    (definition) =>
      definition.kind === Kind.OPERATION_DEFINITION &&
      definition.operation.toString() === "mutation"
  );

  if (operation?.kind !== Kind.OPERATION_DEFINITION) {
    throw new Error("Expected a GraphQL mutation document.");
  }

  const rootField = operation.selectionSet.selections.find(
    (selection) =>
      selection.kind === Kind.FIELD &&
      (selection.alias?.value ?? selection.name.value) === responseKey
  );

  if (rootField?.kind !== Kind.FIELD || rootField.selectionSet === undefined) {
    throw new Error(
      `The mutation field "${responseKey}" must select at least one gql.tada fragment.`
    );
  }

  const fragments = new Map(
    document.definitions.flatMap((definition) =>
      definition.kind === Kind.FRAGMENT_DEFINITION
        ? [[definition.name.value, definition] as const]
        : []
    )
  );
  const fields = new Set<string>();
  const typenames = new Set<string>();
  const visitedFragments = new Set<string>();

  const visitSelections = (
    selections: typeof rootField.selectionSet.selections
  ): void => {
    for (const selection of selections) {
      if (selection.kind === Kind.FIELD) {
        fields.add(selection.alias?.value ?? selection.name.value);
        continue;
      }

      if (selection.kind === Kind.INLINE_FRAGMENT) {
        if (selection.typeCondition !== undefined) {
          typenames.add(selection.typeCondition.name.value);
        }
        visitSelections(selection.selectionSet.selections);
        continue;
      }

      if (visitedFragments.has(selection.name.value)) {
        continue;
      }

      visitedFragments.add(selection.name.value);
      const fragment = fragments.get(selection.name.value);
      if (fragment === undefined) {
        throw new Error(
          `Fragment "${selection.name.value}" is missing from the mutation document.`
        );
      }
      typenames.add(fragment.typeCondition.name.value);
      visitSelections(fragment.selectionSet.selections);
    }
  };

  visitSelections(rootField.selectionSet.selections);

  if (visitedFragments.size === 0) {
    throw new Error(
      `The mutation field "${responseKey}" must select at least one gql.tada fragment.`
    );
  }

  if (typenames.size !== 1) {
    throw new Error(
      `The fragments selected by mutation field "${responseKey}" must describe one entity type.`
    );
  }

  const typename = typenames.values().next().value;
  if (typename === undefined) {
    throw new Error(`Could not infer the entity type for "${responseKey}".`);
  }

  return { fields, typename };
};
