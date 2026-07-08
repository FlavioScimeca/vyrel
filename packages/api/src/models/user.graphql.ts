import { builder } from "@vyrel/graphql/pothos";

const UserType = builder.objectRef<{
  id: string;
  email: string;
  name: string | null;
}>("User");

UserType.implement({
  fields: (t) => ({
    email: t.exposeString("email"),
    id: t.exposeString("id"),
    name: t.string({ nullable: true, resolve: (parent) => parent.name }),
  }),
});

builder.queryFields((t) => ({
  me: t.field({
    nullable: true,
    resolve: (_root, _args, ctx) => {
      if (ctx.session === null) {
        return null;
      }
      return {
        email: ctx.session.user.email,
        id: ctx.session.user.id,
        name: ctx.session.user.name,
      };
    },
    type: UserType,
  }),
}));

builder.mutationType({
  fields: (t) => ({
    _empty: t.string({
      nullable: true,
      resolve: () => null,
    }),
  }),
});
