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

type MutationEntity<TData> = NonNullish<TData[keyof TData]>;

type FragmentNames<TData> = keyof Extract<
  SymbolValues<MutationEntity<TData>>,
  object
>;

type RegisteredFragmentData<TData> = FragmentTypeRegistry[Extract<
  FragmentNames<TData>,
  keyof FragmentTypeRegistry
>];

type UnionToIntersection<TValue> = (
  TValue extends unknown
    ? (value: TValue) => void
    : never
) extends (value: infer TIntersection) => void
  ? TIntersection
  : never;

export type MutationFragmentData<TData> = UnionToIntersection<
  RegisteredFragmentData<TData>
>;

export type ArrayFieldKey<TData> = {
  [TKey in keyof TData]-?: NonNullish<TData[TKey]> extends readonly unknown[]
    ? TKey
    : never;
}[keyof TData] &
  string;

export type ArrayItemAt<TData, TKey extends keyof TData> =
  NonNullish<TData[TKey]> extends readonly (infer TItem)[] ? TItem : never;
