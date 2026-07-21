import { env } from "@vyrel/env/server";
import { Data, Effect } from "effect";
import type { ReactElement } from "react";
import { Resend } from "resend";

const resend = new Resend(env.RESEND_API_KEY);

class SendEmailError extends Data.TaggedError("SendEmailError")<{
  readonly cause?: unknown;
  readonly message: string;
}> {}

export type SendEmailOptions = {
  from?: string;
  html?: string;
  react?: ReactElement;
  replyTo?: string;
  subject: string;
  text?: string;
  to: string | string[];
};

/** Send an email using Resend. @see https://resend.com/docs/send-with-nodejs */
export const sendEmail = (
  options: SendEmailOptions
): Promise<{ data: unknown; success: true }> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const { to, subject, html, text, react, from, replyTo } = options;

      const { data, error } = yield* Effect.tryPromise({
        catch: (cause) =>
          new SendEmailError({
            cause,
            message: "Resend request failed.",
          }),
        try: () =>
          resend.emails.send({
            from: from ?? env.RESEND_FROM_EMAIL,
            html,
            react,
            replyTo,
            subject,
            text,
            to: Array.isArray(to) ? to : [to],
          }),
      });

      if (error !== null) {
        return yield* new SendEmailError({
          message: `Failed to send email: ${error.message}`,
        });
      }

      return { data, success: true as const };
    })
  );

export function getResendClient() {
  return resend;
}

export { resend };
