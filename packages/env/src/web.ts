import { createEnv } from "@t3-oss/env-nextjs";
import { Config, Effect } from "effect";
import { z } from "zod";

const nextPublicServerUrl = Effect.runSync(
  Config.string("NEXT_PUBLIC_SERVER_URL").pipe(
    Config.withDefault("http://localhost:3000")
  )
);

export const env = createEnv({
  client: {
    NEXT_PUBLIC_SERVER_URL: z.url().default("http://localhost:3000"),
  },
  emptyStringAsUndefined: true,
  runtimeEnv: {
    NEXT_PUBLIC_SERVER_URL: nextPublicServerUrl,
  },
});
