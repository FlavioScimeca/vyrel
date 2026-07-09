import { userCreateRest } from "@vyrel/api/models/user/rest/create";
import { Elysia } from "elysia";

export const userRestPlugin = new Elysia({ name: "user-rest" }).use(
  userCreateRest
);
