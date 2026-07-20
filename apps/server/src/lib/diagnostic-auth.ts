import { env } from "@vyrel/env/server";

const DIAGNOSTIC_HEADER = "x-diagnostic-secret";

export const isDiagnosticAuthorized = (request: Request): boolean => {
  const secret = env.DIAGNOSTIC_SECRET;

  if (secret === undefined) {
    return env.NODE_ENV !== "production";
  }

  return request.headers.get(DIAGNOSTIC_HEADER) === secret;
};

export const diagnosticNotFound = (): Response =>
  new Response("Not Found", { status: 404 });
