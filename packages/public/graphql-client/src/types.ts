import type { TypedDocumentNode, Unmasked } from "@apollo/client";

export type DataOf<TDocument> =
  TDocument extends TypedDocumentNode<infer TData, infer _TVariables>
    ? TData
    : never;

export type VariablesOf<TDocument> =
  TDocument extends TypedDocumentNode<infer _TData, infer TVariables>
    ? TVariables
    : never;

export type UnmaskedDataOf<TDocument> = Unmasked<DataOf<TDocument>>;

export type FragmentDataOf<TFragment> = DataOf<TFragment>;

/** Populated by the generated gql.tada fragment registry. */
declare const fragmentRegistryMarker: unique symbol;

export interface FragmentTypeRegistry {
  readonly [fragmentRegistryMarker]?: never;
}

type NonNullish<TValue> = Exclude<TValue, null | undefined>;

type SymbolKeys<TValue> = {
  [TKey in keyof TValue]: TKey extends symbol ? TKey : never;
}[keyof TValue];

type SymbolValues<TValue> = TValue extends object
  ? TValue[SymbolKeys<TValue>]
  : never;

export type MutationResponseKey<TData> = Extract<keyof TData, string>;

type MutationEntityAt<
  TData,
  TField extends MutationResponseKey<TData>,
> = NonNullish<TData[TField]>;

type FragmentNamesAt<
  TData,
  TField extends MutationResponseKey<TData>,
> = keyof Extract<SymbolValues<MutationEntityAt<TData, TField>>, object>;

type RegisteredFragmentDataAt<
  TData,
  TField extends MutationResponseKey<TData>,
> = FragmentTypeRegistry[Extract<
  FragmentNamesAt<TData, TField>,
  keyof FragmentTypeRegistry
>];

type UnionToIntersection<TValue> = (
  TValue extends unknown
    ? (value: TValue) => void
    : never
) extends (value: infer TIntersection) => void
  ? TIntersection
  : never;

export type MutationFragmentDataAt<
  TData,
  TField extends MutationResponseKey<TData>,
> = UnionToIntersection<RegisteredFragmentDataAt<TData, TField>>;

/**
 * Fragment data selected by a mutation. Prefer {@link MutationFragmentDataAt}
 * for multi-root mutations.
 */
export type MutationFragmentData<TData> = MutationFragmentDataAt<
  TData,
  MutationResponseKey<TData>
>;

type IsUnion<TValue, TCandidate = TValue> = TValue extends TCandidate
  ? [TCandidate] extends [TValue]
    ? false
    : true
  : never;

export type MutationFieldOption<
  TData,
  TField extends MutationResponseKey<TData>,
> =
  IsUnion<MutationResponseKey<TData>> extends true
    ? { readonly field: TField }
    : { readonly field?: TField };

export type ArrayFieldKey<TData> = {
  [TKey in keyof TData]-?: NonNullish<TData[TKey]> extends readonly unknown[]
    ? TKey
    : never;
}[keyof TData] &
  string;

export type ArrayItemAt<TData, TKey extends keyof TData> =
  NonNullish<TData[TKey]> extends readonly (infer TItem)[] ? TItem : never;
