import { z } from "zod/v4";

const truthyEnvValues = new Set(["true", "1", "yes", "on"]);
const falsyEnvValues = new Set(["false", "0", "no", "off", ""]);

/** Parses env booleans; unlike `z.coerce.boolean()`, treats `"false"` as false. */
export const envBoolean = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === "boolean") {
      return value;
    }

    const normalized = value.trim().toLowerCase();
    if (truthyEnvValues.has(normalized)) {
      return true;
    }
    if (falsyEnvValues.has(normalized)) {
      return false;
    }

    return Boolean(value);
  });
