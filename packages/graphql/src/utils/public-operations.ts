import {
  type DocumentNode,
  getOperationAST,
  Kind,
  type OperationDefinitionNode,
} from "graphql";

const PUBLIC_ROOT_FIELDS = new Set(["health"]);

export type PublicGraphqlOperationOptions = {
  /** Allow schema introspection queries (GraphiQL) without authentication. */
  allowIntrospection?: boolean;
};

function isPublicQueryOperation(operation: OperationDefinitionNode): boolean {
  if (operation.operation !== "query") {
    return false;
  }

  if (operation.selectionSet.selections.length === 0) {
    return false;
  }

  for (const selection of operation.selectionSet.selections) {
    if (selection.kind !== Kind.FIELD) {
      return false;
    }

    if (!PUBLIC_ROOT_FIELDS.has(selection.name.value)) {
      return false;
    }
  }

  return true;
}

/** GraphiQL / IDE introspection queries (`__schema`, `__type`, …). */
function isIntrospectionQueryOperation(
  operation: OperationDefinitionNode
): boolean {
  if (operation.operation !== "query") {
    return false;
  }

  if (operation.selectionSet.selections.length === 0) {
    return false;
  }

  for (const selection of operation.selectionSet.selections) {
    if (selection.kind !== Kind.FIELD) {
      return false;
    }

    if (!selection.name.value.startsWith("__")) {
      return false;
    }
  }

  return true;
}

/** Operations that do not require authentication (e.g. health checks, dev introspection). */
export function isPublicGraphqlOperation(
  document: DocumentNode,
  operationName: string | null | undefined,
  options: PublicGraphqlOperationOptions = {}
): boolean {
  const operation = getOperationAST(document, operationName ?? undefined);

  if (operation === undefined || operation === null) {
    return false;
  }

  if (isPublicQueryOperation(operation)) {
    return true;
  }

  if (
    options.allowIntrospection === true &&
    isIntrospectionQueryOperation(operation)
  ) {
    return true;
  }

  return false;
}
