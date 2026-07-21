import { createLogger, initLogging } from "@vyrel/logging";

export default defineContentScript({
  main() {
    initLogging({ service: "vyrel-extension", pretty: true });

    const log = createLogger({ surface: "content" });
    log.set({ event: "startup" });
    log.emit();
  },
  matches: ["*://*.google.com/*"],
});
