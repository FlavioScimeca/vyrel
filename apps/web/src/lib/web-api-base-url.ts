import { env } from "@vyrel/env/web";

/** Browser calls stay same-origin so Better Auth cookies attach to the web app. */
export function getWebApiBaseURL(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return env.NEXT_PUBLIC_SERVER_URL;
}
