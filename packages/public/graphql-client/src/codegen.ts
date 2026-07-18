import type {
  GraphqlClientSchemaMetadata,
  GraphqlTypeRef,
} from "./schema-metadata";

type GraphqlScalarMap = object;

type NamedValue<
  TSchema extends GraphqlClientSchemaMetadata,
  TName extends string,
  TScalars extends GraphqlScalarMap,
> = TName extends keyof TSchema["types"]
  ? ModelOf<TSchema, TName, TScalars>
  : TName extends keyof TSchema["enums"]
    ? TSchema["enums"][TName][number]
    : TName extends "String" | "ID"
      ? string
      : TName extends "Int" | "Float"
        ? number
        : TName extends "Boolean"
          ? boolean
          : TName extends keyof TScalars
            ? TScalars[TName]
            : unknown;

type ValueOfTypeRef<
  TSchema extends GraphqlClientSchemaMetadata,
  TRef extends GraphqlTypeRef,
  TScalars extends GraphqlScalarMap = Record<never, never>,
> =
  TRef extends Readonly<{ kind: "NON_NULL"; ofType: infer TInner }>
    ? TInner extends GraphqlTypeRef
      ? NonNullable<ValueOfTypeRef<TSchema, TInner, TScalars>>
      : never
    : TRef extends Readonly<{ kind: "LIST"; ofType: infer TInner }>
      ? TInner extends GraphqlTypeRef
        ? readonly ValueOfTypeRef<TSchema, TInner, TScalars>[] | null
        : never
      : TRef extends Readonly<{ kind: "NAMED"; name: infer TName }>
        ? TName extends string
          ? NamedValue<TSchema, TName, TScalars> | null
          : never
        : never;

export type ModelOf<
  TSchema extends GraphqlClientSchemaMetadata,
  TName extends keyof TSchema["types"],
  TScalars extends GraphqlScalarMap = Record<never, never>,
> = {
  readonly [TField in keyof TSchema["types"][TName]["fields"]]: ValueOfTypeRef<
    TSchema,
    TSchema["types"][TName]["fields"][TField]["type"],
    TScalars
  >;
};

export type { GraphqlClientSchemaMetadata } from "./schema-metadata";
