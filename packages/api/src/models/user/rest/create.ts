import { Elysia, t } from "elysia";

import { createUser } from "../services/create.service";
import { finishUserCreate, runUserCreateEffect, UserHttpError } from "./effect";

export const userCreateRest = new Elysia({ name: "user-create-rest" })
  .onError(({ error, set }) => {
    if (error instanceof UserHttpError) {
      set.status = error.status;
      return error.body;
    }
  })
  .post(
    "/api/users",
    ({ body, request, set }) =>
      runUserCreateEffect(
        createUser(
          {
            avatar: body.avatar,
            callbackURL: body.callbackURL,
            email: body.email,
            name: body.name,
            password: body.password,
            printifyToken: body.printifyToken,
          },
          request.headers
        )
      ).then((result) => finishUserCreate(set, result)),
    {
      body: t.Object({
        avatar: t.Optional(
          t.File({
            maxSize: "5m",
            type: ["image/png", "image/jpeg", "image/webp", "image/gif"],
          })
        ),
        callbackURL: t.Optional(t.String()),
        email: t.String({ format: "email" }),
        name: t.String({ minLength: 1 }),
        password: t.String({ minLength: 8 }),
        printifyToken: t.String({ minLength: 1 }),
      }),
      detail: {
        description:
          "Registers a user via Better Auth email sign-up and optionally stores an avatar on Cloudflare R2.",
        summary: "Create user",
        tags: ["Users"],
      },
    }
  );
