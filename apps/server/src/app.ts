import { cors } from "@elysiajs/cors";
import { env } from "@vyrel/env/server";
import { getSignedDownloadUrl } from "@vyrel/storage/object-storage";
import { Elysia, t } from "elysia";
import {
  diagnosticNotFound,
  isDiagnosticAuthorized,
} from "./lib/diagnostic-auth";
import { isValidDiagnosticStorageKey } from "./lib/diagnostic-storage-key";
import { faviconPath } from "./lib/favicon";
import { imageWorkerBundleExists } from "./lib/image-worker-bundle";
import {
  getImageWorkerPathCandidates,
  resolveImageWorkerPath,
  runImageWorker,
} from "./lib/image-worker-runner";
import { authPlugin } from "./plugins/auth";
import { graphqlPlugin } from "./plugins/graphql";
import { organizationRestPlugin } from "./plugins/organization-rest";
import { userRestPlugin } from "./plugins/user-rest";

const hostRuntimeInfo = () => ({
  architecture: process.arch,
  bunRevision: Bun.revision,
  bunVersion: Bun.version,
  cwd: process.cwd(),
  hasBunImage: typeof Bun.Image,
  platform: process.platform,
});

const buildWorkerCheckResponse = async () => {
  const resolvedPath = resolveImageWorkerPath();
  const candidates = await Promise.all(
    getImageWorkerPathCandidates().map(async (path) => ({
      exists: await Bun.file(path).exists(),
      path,
    }))
  );

  const run = await runImageWorker({ mode: "diagnostic" });

  return {
    host: hostRuntimeInfo(),
    worker: {
      bundleExists: imageWorkerBundleExists(),
      candidates,
      exists: resolvedPath !== null,
      resolvedPath,
      run,
    },
  };
};

export const app = new Elysia()
  .use(
    cors({
      allowedHeaders: ["Content-Type", "Authorization", "x-diagnostic-secret"],
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      origin: env.CORS_ORIGIN,
    })
  )
  .use(graphqlPlugin)
  .use(userRestPlugin)
  .use(organizationRestPlugin)
  .use(authPlugin)
  .get("/favicon.ico", ({ set }) => {
    set.headers["cache-control"] = "public, max-age=3600";
    return Bun.file(faviconPath);
  })
  .get("/check-bun", () => {
    // Vercel/Elysia stamp: major only (`"1.x"`); Vercel manages minor/patch.
    // https://elysiajs.com/integrations/vercel
    const [major] = Bun.version.split(".");
    return {
      bunVersion: `${major}.x`,
      revision: Bun.revision,
      runtime: "bun",
      version: Bun.version,
    };
  })
  .get("/check-image-worker", async ({ request, set }) => {
    if (!isDiagnosticAuthorized(request)) {
      set.status = 404;
      return diagnosticNotFound();
    }

    return await buildWorkerCheckResponse();
  })
  .post(
    "/check-image-worker",
    async ({ body, request, set }) => {
      if (!isDiagnosticAuthorized(request)) {
        set.status = 404;
        return diagnosticNotFound();
      }

      let sourceUrl: string | null = null;

      if (body.storageKey !== undefined) {
        if (!isValidDiagnosticStorageKey(body.storageKey)) {
          set.status = 400;
          return {
            error:
              "storageKey must start with diagnostics/ and use safe characters.",
          };
        }

        sourceUrl = getSignedDownloadUrl(body.storageKey);
      } else if (body.sourceUrl === undefined) {
        set.status = 400;
        return {
          error: "Provide storageKey or, in development, sourceUrl.",
        };
      } else {
        if (env.NODE_ENV === "production") {
          set.status = 400;
          return {
            error: "sourceUrl is only accepted outside production.",
          };
        }

        const { sourceUrl: manualSourceUrl } = body;
        sourceUrl = manualSourceUrl;
      }

      const resolvedPath = resolveImageWorkerPath();

      const run = await runImageWorker({
        maxInputBytes: body.maxInputBytes,
        maxPixels: body.maxPixels,
        mode: "probe-image",
        source: {
          type: "url",
          url: sourceUrl,
        },
      });

      return {
        host: hostRuntimeInfo(),
        worker: {
          exists: resolvedPath !== null,
          resolvedPath,
          run,
        },
      };
    },
    {
      body: t.Object({
        maxInputBytes: t.Optional(t.Number()),
        maxPixels: t.Optional(t.Number()),
        sourceUrl: t.Optional(t.String()),
        storageKey: t.Optional(t.String()),
      }),
    }
  )
  .get("/", () => "OK");

export const GET = app.handle;
export const POST = app.handle;
export const PATCH = app.handle;
export const DELETE = app.handle;
export const PUT = app.handle;

export type ServerApp = typeof app;
