import { organizationCreateRest } from "@vyrel/api/models/organization/rest/create";
import { Elysia } from "elysia";

export const organizationRestPlugin = new Elysia({
  name: "organization-rest",
}).use(organizationCreateRest);
