import { QueryClient } from "@tanstack/react-query";
import { env } from "@vyrel/env/web";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60,
    },
  },
});

const GRAPHQL_URL = `${env.NEXT_PUBLIC_SERVER_URL}/graphql`;

export async function graphqlFetch<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(GRAPHQL_URL, {
    body: JSON.stringify({ query, variables }),
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const json = await response.json();

  if (json.errors) {
    throw new Error(
      json.errors.map((e: { message: string }) => e.message).join(", ")
    );
  }

  return json.data as T;
}
