import { env } from "@vyrel/env/server";
import type { ReactElement } from "react";
import { Resend } from "resend";

const resend = new Resend(env.RESEND_API_KEY);

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
export async function sendEmail(options: SendEmailOptions) {
  const { to, subject, html, text, react, from, replyTo } = options;

  const { data, error } = await resend.emails.send({
    from: from ?? env.RESEND_FROM_EMAIL,
    html,
    react,
    replyTo,
    subject,
    text,
    to: Array.isArray(to) ? to : [to],
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return { data, success: true as const };
}

export function getResendClient() {
  return resend;
}

export { resend };
