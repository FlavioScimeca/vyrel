import type { ReactNode } from "react";

import { ApolloProvider } from "@/graphql/apollo/provider";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <ApolloProvider>{children}</ApolloProvider>;
}
