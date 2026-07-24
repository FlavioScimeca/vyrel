import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

type PublicEnv = {
  WXT_PUBLIC_SERVER_URL?: string;
  WXT_PUBLIC_WEB_URL?: string;
};

/** Vite/`import.meta.env` when bundled by WXT; empty object in non-Vite contexts. */
function readPublicEnv(): PublicEnv {
  const meta = import.meta as ImportMeta & { env?: PublicEnv };
  return meta.env ?? {};
}

const publicEnv = readPublicEnv();

export const env = createEnv({
  client: {
    WXT_PUBLIC_SERVER_URL: z.url().default("http://localhost:3000"),
    WXT_PUBLIC_WEB_URL: z.url().default("http://localhost:3001"),
  },
  clientPrefix: "WXT_PUBLIC_",
  emptyStringAsUndefined: true,
  runtimeEnv: {
    WXT_PUBLIC_SERVER_URL: publicEnv.WXT_PUBLIC_SERVER_URL,
    WXT_PUBLIC_WEB_URL: publicEnv.WXT_PUBLIC_WEB_URL,
  },
});
