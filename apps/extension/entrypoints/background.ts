import { createLogger, initLogging } from "@vyrel/logging";

import { registerCookieMessageHandlers } from "@/src/lib/auth/cookie-background";

export default defineBackground(() => {
  initLogging({ service: "vyrel-extension", pretty: true });

  registerCookieMessageHandlers();

  const log = createLogger({ surface: "background" });
  log.set({
    event: "startup",
    extensionId: browser.runtime.id,
  });
  log.emit();
});
