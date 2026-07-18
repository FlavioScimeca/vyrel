export type GraphqlTypeRef =
  | Readonly<{ kind: "LIST"; ofType: GraphqlTypeRef }>
  | Readonly<{ kind: "NAMED"; name: string }>
  | Readonly<{ kind: "NON_NULL"; ofType: GraphqlTypeRef }>;

export interface GraphqlFieldMetadata {
  readonly type: GraphqlTypeRef;
}

export interface GraphqlObjectMetadata {
  readonly fields: Readonly<Record<string, GraphqlFieldMetadata>>;
  readonly keyFields: readonly string[];
}

export interface GraphqlClientSchemaMetadata {
  readonly enums: Readonly<Record<string, readonly string[]>>;
  readonly mutationType?: string;
  readonly queryType?: string;
  readonly types: Readonly<Record<string, GraphqlObjectMetadata>>;
}
