import { useAPQ } from "@graphql-yoga/plugin-apq";
import { env } from "@vyrel/env/server";
import { createFetch } from "@whatwg-node/fetch";
import { createYoga } from "graphql-yoga";
import { createGraphqlContext } from "./context";
import { formatError } from "./lib/error-handler";
import { schema } from "./schema";
import {
  profilingPlugin,
  requireAuthPlugin,
  timingPlugin,
} from "./utils/plugins";
import { getProfile } from "./utils/profiler";

const isProd = env.NODE_ENV === "production";

export const graphqlYogaServer = createYoga({
  // @effect-diagnostics-next-line effect/asyncFunction:off
  context: async ({ request }) => {
    const store = getProfile();
    const t0 = performance.now();
    const context = await createGraphqlContext(request);

    if (store !== undefined) {
      store.authMs = performance.now() - t0;
    }

    return context;
  },
  fetchAPI: createFetch({
    formDataLimits: {
      fileSize: env.MEDIA_MAX_UPLOAD_BYTES,
      files: 1,
    },
  }),
  graphiql: !isProd,
  graphqlEndpoint: "/api/graphql",
  logging: env.NODE_ENV === "development" ? "debug" : "warn",
  maskedErrors: {
    maskError: (error, message) => formatError(error, message, !isProd),
  },
  plugins: [
    ...(env.PROFILING ? [profilingPlugin] : [timingPlugin]),
    // biome-ignore lint/correctness/useHookAtTopLevel: GraphQL Yoga plugin factory, not a React hook
    useAPQ({
      responseConfig: {
        forceStatusCodeOk: true,
      },
    }),
    requireAuthPlugin,
  ],
  schema,
});
