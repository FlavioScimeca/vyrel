import { createLogger, initLogging } from "@vyrel/logging";

export default defineBackground(() => {
  initLogging({ service: "vyrel-extension", pretty: true });

  const log = createLogger({ surface: "background" });
  log.set({
    event: "startup",
    extensionId: browser.runtime.id,
  });
  log.emit();
});
