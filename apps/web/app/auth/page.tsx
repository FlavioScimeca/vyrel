import { Suspense } from "react";
import { parseAuthMode } from "@/features/auth/form.schema";
import { isSafeRedirectPath } from "@/features/auth/resolve-post-auth-redirect";
import { AuthScreen } from "@/features/auth/screen";

type AuthSearchParams = Promise<{
  mode?: string | string[];
  next?: string | string[];
}>;

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return null;
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: AuthSearchParams;
}) {
  const params = await searchParams;
  const mode = parseAuthMode(firstParam(params.mode));
  const next = firstParam(params.next);
  const safeNext = next !== null && isSafeRedirectPath(next) ? next : null;

  return (
    <Suspense fallback={null}>
      <AuthScreen mode={mode} safeNext={safeNext} />
    </Suspense>
  );
}
