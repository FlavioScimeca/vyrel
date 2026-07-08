import "@pothos/plugin-validation";
import "@pothos/plugin-with-input";
import type {
  MutationFieldBuilder,
  QueryFieldBuilder,
  SchemaTypes,
} from "@pothos/core";

export type AppSchemaTypes<Types extends SchemaTypes = SchemaTypes> = Types;

export type TypeMutationFieldBuilder<Types extends SchemaTypes = SchemaTypes> =
  MutationFieldBuilder<Types, unknown>;

export type TypeQueryFieldBuilder<Types extends SchemaTypes = SchemaTypes> =
  QueryFieldBuilder<Types, unknown>;
