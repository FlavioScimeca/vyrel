// biome-ignore lint/style/noExportedImports: _
import { app } from "./app";

export type { ServerApp } from "./app";

if (import.meta.main) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

export default app;
