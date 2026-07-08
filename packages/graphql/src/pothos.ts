import SchemaBuilder from "@pothos/core";
import DataloaderPlugin from "@pothos/plugin-dataloader";
import DrizzlePlugin from "@pothos/plugin-drizzle";
import RelayPlugin from "@pothos/plugin-relay";
import ScopeAuthPlugin from "@pothos/plugin-scope-auth";
import ValidationPlugin from "@pothos/plugin-validation";
import WithInputPlugin from "@pothos/plugin-with-input";
import type { AuthClaims } from "@vyrel/auth/lib/verify-bearer";
import { db } from "@vyrel/db";
import { relations } from "@vyrel/db/relations";
import type { Session, User } from "better-auth";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { DateTimeResolver, JSONResolver } from "graphql-scalars";
import { GraphQLFile } from "./scalars/file";

type DrizzleRelations = typeof relations;

export interface PothosContext {
  session: { user: User; session: Session } | null;
}

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
    File: {
      Output: File;
      Input: File;
    };
  };
  Context: {
    user?: AuthClaims;
    /** Original request headers (cookies) for Better Auth `auth.api.*` calls. */
    headers: Headers;
  };
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
      authenticated: Boolean(ctx?.user),
    }),
    treatErrorsAsUnauthorized: true,
  },
});

builder.addScalarType("DateTime", DateTimeResolver);
builder.addScalarType("JSON", JSONResolver);
builder.addScalarType("File", GraphQLFile);
