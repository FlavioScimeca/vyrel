import { createVyrelNextInstrumentation } from "@vyrel/logging/next";

export const { register, onRequestError } = createVyrelNextInstrumentation({
  service: "vyrel-docs",
});
