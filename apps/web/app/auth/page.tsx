import { redirect } from "next/navigation";
import { Suspense } from "react";
import { parseAuthMode } from "@/features/auth/form.schema";
import { isSafeRedirectPath } from "@/features/auth/resolve-post-auth-redirect";
import { AuthScreen } from "@/features/auth/screen";
import { getServerAuthState } from "@/lib/server-session";

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
  const [params, authState] = await Promise.all([
    searchParams,
    getServerAuthState(),
  ]);

  if (authState !== null) {
    redirect(authState.hasOrganizationAccess ? "/dashboard" : "/onboarding");
  }

  const mode = parseAuthMode(firstParam(params.mode));
  const next = firstParam(params.next);
  const safeNext = next !== null && isSafeRedirectPath(next) ? next : null;

  return (
    <Suspense fallback={null}>
      <AuthScreen mode={mode} safeNext={safeNext} />
    </Suspense>
  );
}
