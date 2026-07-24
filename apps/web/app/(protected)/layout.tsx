import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ApolloProvider } from "@/graphql/apollo/provider";
import { getServerAuthState } from "@/lib/server-session";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const authState = await getServerAuthState();

  if (authState === null) {
    redirect("/auth");
  }

  if (
    !authState.hasOrganizationAccess ||
    authState.activeOrganizationId === null
  ) {
    redirect("/onboarding");
  }

  return <ApolloProvider>{children}</ApolloProvider>;
}
