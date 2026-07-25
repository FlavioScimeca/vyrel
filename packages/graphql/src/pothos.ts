import SchemaBuilder from "@pothos/core";
import DataloaderPlugin from "@pothos/plugin-dataloader";
import DrizzlePlugin from "@pothos/plugin-drizzle";
import RelayPlugin from "@pothos/plugin-relay";
import ScopeAuthPlugin from "@pothos/plugin-scope-auth";
import ValidationPlugin from "@pothos/plugin-validation";
import WithInputPlugin from "@pothos/plugin-with-input";
import { db } from "@vyrel/db";
import { relations } from "@vyrel/db/relations";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { DateTimeResolver, JSONResolver } from "graphql-scalars";
import type { GraphQLContext } from "./context";
import { GraphQLFile } from "./scalars/file";
import { GraphQLLocalDate } from "./scalars/local-date";
import { GraphQLURL } from "./scalars/url";

type DrizzleRelations = typeof relations;

export type { GraphQLContext as PothosContext } from "./context";

type PothosTypes = {
  Connection: {
    totalCount: number;
  };
  DrizzleRelations: DrizzleRelations;
  AuthScopes: {
    authenticated: boolean;
  };
  Scalars: {
    ID: {
      Output: string;
      Input: string;
    };
    DateTime: {
      Output: Date;
      Input: Date;
    };
    JSON: {
      Output: unknown;
      Input: unknown;
    };
    LocalDate: {
      Output: string;
      Input: string;
    };
    File: {
      Output: File;
      Input: File;
    };
    URL: {
      Output: string;
      Input: string;
    };
  };
  Context: GraphQLContext;
};

export const builder = new SchemaBuilder<PothosTypes>({
  drizzle: {
    client: db,
    getTableConfig,
    relations,
  },
  plugins: [
    DataloaderPlugin,
    DrizzlePlugin,
    RelayPlugin,
    ScopeAuthPlugin,
    ValidationPlugin,
    WithInputPlugin,
  ],
  relay: {
    nodeQueryOptions: false,
    nodesOnConnection: true,
    nodesQueryOptions: false,
  },
  scopeAuth: {
    authScopes: (ctx) => ({
      authenticated: ctx.isAuthenticated,
    }),
    treatErrorsAsUnauthorized: true,
  },
});

builder.addScalarType("DateTime", DateTimeResolver);
builder.addScalarType("JSON", JSONResolver);
builder.addScalarType("File", GraphQLFile);
builder.addScalarType("LocalDate", GraphQLLocalDate);
builder.addScalarType("URL", GraphQLURL);
