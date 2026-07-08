import { builder } from "@vyrel/graphql/pothos";

builder.queryType({});

builder.queryFields((t) => ({
  health: t.string({
    resolve: () => "OK",
  }),
}));
