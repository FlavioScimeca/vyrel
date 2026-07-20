// TEMP: open diagnostics while testing image worker on Vercel preview.
// Restore secret check before shipping.
export const isDiagnosticAuthorized = (_request: Request): boolean => true;

export const diagnosticNotFound = (): Response =>
  new Response("Not Found", { status: 404 });
