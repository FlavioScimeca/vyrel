import { Config, Effect } from "effect";

// biome-ignore lint/style/noExportedImports: _
import { app } from "./app";

export type { ServerApp } from "./app";

if (import.meta.main) {
  const port = Effect.runSync(
    Config.integer("PORT").pipe(Config.withDefault(3000))
  );

  app.listen(port, () => {
    Effect.runSync(Effect.log(`Server is running on http://localhost:${port}`));
  });
}

export default app;
