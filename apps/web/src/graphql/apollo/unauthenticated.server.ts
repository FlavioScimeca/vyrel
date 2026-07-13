import type { ErrorLike } from "@apollo/client";
import { redirect } from "next/navigation";

import { isUnauthenticatedError } from "./unauthenticated";

const AUTH_PATH = "/auth";

/** Server Component redirect when GraphQL returns UNAUTHENTICATED. */
export function redirectIfUnauthenticated(error: ErrorLike | undefined): void {
  if (error !== undefined && isUnauthenticatedError(error)) {
    redirect(AUTH_PATH);
  }
}
