import type { TypedDocumentNode } from "@apollo/client";
import { describe, expect, it } from "vitest";

import {
  useOptimisticCreate,
  useOptimisticDelete,
  useOptimisticUpdate,
} from "./hooks";
import type { MutationFragmentDataAt } from "./types";

declare const fragmentReferences: unique symbol;

declare module "./types" {
  interface FragmentTypeRegistry {
    readonly FirstMutationFragment: {
      readonly id: string;
      readonly title: string;
    };
    readonly SecondMutationFragment: {
      readonly id: string;
      readonly name: string;
    };
  }
}

interface MutationVariables {
  readonly id: string;
  readonly value: string;
}

interface MultiRootMutationData {
  readonly first: {
    readonly [fragmentReferences]: {
      readonly FirstMutationFragment: true;
    };
  };
  readonly second: {
    readonly [fragmentReferences]: {
      readonly SecondMutationFragment: true;
    };
  };
}

interface SingleRootMutationData {
  readonly first: MultiRootMutationData["first"];
}

declare const multiRootMutation: TypedDocumentNode<
  MultiRootMutationData,
  MutationVariables
>;
declare const singleRootMutation: TypedDocumentNode<
  SingleRootMutationData,
  MutationVariables
>;

type FirstFragmentData = MutationFragmentDataAt<MultiRootMutationData, "first">;

const exerciseHookTypes = (): void => {
  const first: FirstFragmentData = { id: "1", title: "First" };
  useOptimisticUpdate(multiRootMutation, {
    current: first,
    field: "first",
    optimistic: (_variables, current) => ({ title: current.title }),
  });
  useOptimisticCreate(multiRootMutation, {
    field: "second",
    optimistic: () => ({ name: "Second" }),
  });
  useOptimisticDelete(multiRootMutation, {
    field: "first",
    id: ({ id }) => id,
  });
  useOptimisticUpdate(singleRootMutation, {
    current: first,
    optimistic: () => ({ title: "Updated" }),
  });

  // @ts-expect-error A multi-root mutation requires an explicit response key.
  useOptimisticDelete(multiRootMutation, { id: ({ id }) => id });
  useOptimisticDelete(multiRootMutation, {
    // @ts-expect-error The response key must exist in the mutation result.
    field: "missing",
    id: ({ id }) => id,
  });
  useOptimisticUpdate(multiRootMutation, {
    // @ts-expect-error The selected field only exposes FirstMutationFragment.
    current: { id: "1", name: "Wrong fragment" },
    field: "first",
    optimistic: () => ({}),
  });
  useOptimisticUpdate(multiRootMutation, {
    // @ts-expect-error Current data must contain every field in the selected fragment.
    current: { id: "1" },
    field: "first",
    optimistic: () => ({}),
  });
  useOptimisticCreate(multiRootMutation, {
    field: "second",
    // @ts-expect-error The optimistic value must match the selected field.
    optimistic: () => ({ title: "Wrong fragment" }),
  });
  useOptimisticDelete(singleRootMutation, {
    id: ({ id }) => id,
    // @ts-expect-error Cache identity is configured only through codegen.
    keyField: "email",
  });

  const [deleteMutation] = useOptimisticDelete(singleRootMutation, {
    id: ({ id }) => id,
  });
  deleteMutation({
    // @ts-expect-error Package-controlled optimistic responses cannot be overridden.
    optimisticResponse: { first: null },
    variables: { id: "1", value: "value" },
  });
};

describe("optimistic hook public types", () => {
  it("compile field-aware hook contracts", () => {
    expect(typeof exerciseHookTypes).toBe("function");
  });
});
