import { Resend } from "resend";

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailOptions {
  from?: string;
  html?: string;
  react?: React.ReactElement;
  replyTo?: string;
  subject: string;
  text?: string;
  to: string | string[];
}

/**
 * Send an email using Resend
 * @see https://resend.com/docs/send-with-nodejs
 */
export async function sendEmail(options: SendEmailOptions) {
  const { to, subject, html, text, react, from, replyTo } = options;

  const fromAddress =
    from || process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      html,
      react,
      replyTo,
      subject,
      text,
      to: Array.isArray(to) ? to : [to],
    });

    if (error) {
      console.error("Failed to send email:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return { data, success: true };
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
}

/**
 * Get the Resend client instance for advanced usage
 */
export function getResendClient() {
  return resend;
}

export { resend };
