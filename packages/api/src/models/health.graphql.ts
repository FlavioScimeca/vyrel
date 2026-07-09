import { builder } from "@vyrel/graphql/pothos";

builder.queryType({});
builder.mutationType({});

builder.queryFields((t) => ({
  health: t.string({
    resolve: () => "OK",
  }),
}));
