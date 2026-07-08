import { getAppLogger } from "@vyrel/logging";

/** Root logger for `@merch-dock/api` modules. Configure logging in the server entrypoint. */
export const apiLogger = getAppLogger("api");
