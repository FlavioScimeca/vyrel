import { GraphQLError } from "graphql";

export const toGraphQLError = (
  message: string,
  code: string,
  status: number,
  extra?: Record<string, unknown>
) =>
  new GraphQLError(message, {
    extensions: {
      ...extra,
      code,
      http: { status },
    },
  });
