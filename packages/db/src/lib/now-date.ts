import { DateTime } from "effect";

/** Drizzle `$onUpdate` callback — Effect `DateTime` as a JS `Date`. */
export const nowDate = (): Date => DateTime.toDateUtc(DateTime.unsafeNow());
