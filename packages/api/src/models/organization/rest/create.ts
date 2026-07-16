import { Elysia, t } from "elysia";

import { createOrganization } from "../services/create.service";
import {
  finishOrganizationCreate,
  OrganizationHttpError,
  runOrganizationCreateEffect,
} from "./effect";

export const organizationCreateRest = new Elysia({
  name: "organization-create-rest",
})
  .onError(({ error, set }) => {
    if (error instanceof OrganizationHttpError) {
      set.status = error.status;
      return error.body;
    }
  })
  .post(
    "/api/organizations",
    ({ body, request, set }) =>
      runOrganizationCreateEffect(
        createOrganization(
          {
            logo: body.logo,
            name: body.name,
            slug: body.slug,
          },
          request.headers
        )
      ).then((result) => finishOrganizationCreate(set, result)),
    {
      body: t.Object({
        logo: t.Optional(
          t.File({
            maxSize: "5m",
            type: ["image/png", "image/jpeg", "image/webp", "image/gif"],
          })
        ),
        name: t.String({ minLength: 1 }),
        slug: t.String({ minLength: 1 }),
      }),
      detail: {
        description:
          "Creates an organization via Better Auth and optionally stores a logo on Cloudflare R2.",
        summary: "Create organization",
        tags: ["Organizations"],
      },
    }
  );
