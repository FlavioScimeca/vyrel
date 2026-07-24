import { graphql } from "@/src/graphql/gql";

/** Placeholder fragment so the GraphQL client registry has a typed entry. */
export const ExtensionHealthFragment = graphql(`
  fragment ExtensionHealth on Query {
    health
  }
`);

/** Minimal document so GraphQL client codegen has at least one operation. */
export const ExtensionHealthDocument = graphql(`
  query ExtensionHealth {
    ...ExtensionHealth
  }
`, [ExtensionHealthFragment]);
