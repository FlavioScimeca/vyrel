import { env } from "@vyrel/env/server";
import { GraphQLError } from "graphql";
import type { Plugin } from "graphql-yoga";
import { graphqlRequestLoggers } from "../context";
import { getProfile, truncateSql } from "./profiler";
import { isPublicGraphqlOperation } from "./public-operations";

const isProd = env.NODE_ENV === "production";

/** Blocks GraphQL execution when the request is not authenticated. */
export const requireAuthPlugin: Plugin = {
  onExecute({ args, setResultAndStopExecution }) {
    if (
      isPublicGraphqlOperation(args.document, args.operationName ?? undefined, {
        allowIntrospection: !isProd,
      })
    ) {
      return;
    }

    const isAuthenticated =
      typeof args.contextValue === "object" &&
      args.contextValue !== null &&
      "isAuthenticated" in args.contextValue &&
      args.contextValue.isAuthenticated === true;

    if (isAuthenticated) {
      return;
    }

    setResultAndStopExecution({
      data: null,
      errors: [
        new GraphQLError("UNAUTHENTICATED", {
          extensions: {
            code: "UNAUTHENTICATED",
            http: { status: 401 },
          },
        }),
      ],
    });
  },
};

const requestStart = new WeakMap<Request, number>();
const requestOpName = new WeakMap<Request, string>();

/** Lightweight timing when profiling is off. */
export const timingPlugin: Plugin = {
  onParams({ request, params }) {
    if (!Array.isArray(params)) {
      requestOpName.set(request, params.operationName ?? "anonymous");
      return;
    }
    const names = params.map((p) => p.operationName ?? "anonymous");
    requestOpName.set(request, names.join(","));
  },
  onRequest({ request }) {
    requestStart.set(request, performance.now());
  },
  onResponse({ request, response }) {
    const start = requestStart.get(request);
    if (start === undefined) {
      return;
    }

    const ms = performance.now() - start;
    const opName = requestOpName.get(request) ?? "unknown";
    graphqlRequestLoggers.get(request)?.set({
      graphql: {
        durationMs: Number(ms.toFixed(2)),
        method: request.method,
        op: opName,
        status: response.status,
        url: request.url,
      },
    });
  },
};

/** Detailed phase + SQL timing when `PROFILING=1` (dev only). */
export const profilingPlugin: Plugin = {
  onExecute() {
    const store = getProfile();
    if (store === undefined) {
      return;
    }
    const t0 = performance.now();
    return {
      onExecuteDone: () => {
        store.executeMs = performance.now() - t0;
      },
    };
  },
  onParams({ params }) {
    const store = getProfile();
    if (store !== undefined) {
      store.operationName = params.operationName ?? "anonymous";
    }
  },
  onParse() {
    const store = getProfile();
    if (store === undefined) {
      return;
    }
    const t0 = performance.now();
    return () => {
      store.parseMs = performance.now() - t0;
    };
  },
  onResponse({ request, response }) {
    const store = getProfile();
    if (store === undefined) {
      return;
    }

    const total = performance.now() - store.startedAt;
    const sqlCount = store.sql.length;
    const sqlSum = store.sql.reduce((acc, e) => acc + e.ms, 0);
    const op = store.operationName ?? "unknown";
    const auth = store.authMs ?? 0;
    const parse = store.parseMs ?? 0;
    const validate = store.validateMs ?? 0;
    const execute = store.executeMs ?? 0;
    const limit = env.PROFILE_SQL_LIMIT;

    graphqlRequestLoggers.get(request)?.set({
      graphql: {
        authMs: Number(auth.toFixed(2)),
        executeMs: Number(execute.toFixed(2)),
        method: request.method,
        op,
        parseMs: Number(parse.toFixed(2)),
        sqlCount,
        sqlSumMs: Number(sqlSum.toFixed(2)),
        status: response.status,
        totalMs: Number(total.toFixed(2)),
        url: request.url,
        validateMs: Number(validate.toFixed(2)),
        sql: store.sql.slice(0, limit).map((e, index) => ({
          durationMs: Number(e.ms.toFixed(2)),
          index,
          sql: truncateSql(e.sql, 220),
        })),
        ...(store.sql.length > limit
          ? { sqlHiddenCount: store.sql.length - limit }
          : {}),
      },
    });
  },
  onValidate() {
    const store = getProfile();
    if (store === undefined) {
      return;
    }
    const t0 = performance.now();
    return () => {
      store.validateMs = performance.now() - t0;
    };
  },
};
