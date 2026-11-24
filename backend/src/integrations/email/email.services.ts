import { Resend } from "resend";
import { createLogger } from "../../logger/logger.js";
import { EmailContent } from "./email.type.js";
import { passwordResetEmail, verificationEmail } from "./email.template.js";
import { env } from "../../config/env.js"
import { EmailError } from "./email.error.js";

const logger = createLogger("email");

const isProd = env.NODE_ENV === "production";
const apiKey = env.RESEND_API_KEY;
const FROM = env.EMAIL_FROM ?? "eClass <onboarding@resend.dev>"; // resend.dev sender: dev only
const FRONTEND_URL = (env.FRONTEND_URL ?? "http://localhost:5173").replace(/\/$/, "");

const VERIFY_EXPIRES_HOURS = 24;
const RESET_EXPIRES_MINUTES = 60;

// Fail fast in production instead of discovering it on the first signup.
if (isProd) {
  const missing = ["RESEND_API_KEY", "EMAIL_FROM", "FRONTEND_URL"].filter((k) => !process.env[k]);
  if (missing.length > 0) throw new Error(`Missing email env vars: ${missing.join(", ")}`);
}

const resend = apiKey ? new Resend(apiKey) : null;

/** Never write a full address to logs: "jo***@gmail.com" is enough to debug. */
const maskEmail = (email: string): string => {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
};

/** Rate limits (429) and provider-side failures (5xx) are worth retrying; 4xx are not. */
const isTransient = (statusCode: number | null | undefined): boolean =>
  statusCode === 429 || (statusCode !== null && statusCode !== undefined && statusCode >= 500);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* --------------------------------- core --------------------------------- */

export const sendEmail = async (to: string, content: EmailContent): Promise<void> => {
  // Local development without an API key: print instead of sending.
  if (!resend) {
    logger.info({ to: maskEmail(to), subject: content.subject, text: content.text }, "email (not sent: no RESEND_API_KEY)");
    return;
  }

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM,
        to,
        subject: content.subject,
        html: content.html,
        text: content.text, // plain-text part improves deliverability and accessibility
      });

      if (!error) {
        logger.info({ to: maskEmail(to), emailId: data?.id, subject: content.subject }, "email sent");
        return;
      }

      if (attempt < maxAttempts && isTransient(error.statusCode)) {
        logger.warn({ to: maskEmail(to), attempt, statusCode: error.statusCode }, "email send failed, retrying");
        await sleep(500 * 2 ** (attempt - 1));
        continue;
      }

      throw new EmailError(`Email provider rejected the message: ${error.message}`, { cause: error });
    } catch (err) {
      if (err instanceof EmailError) {
        logger.error({ err, to: maskEmail(to) }, "email send failed");
        throw err;
      }
      // Network-level failure (DNS, reset, timeout)
      if (attempt < maxAttempts) {
        logger.warn({ err, to: maskEmail(to), attempt }, "email send errored, retrying");
        await sleep(500 * 2 ** (attempt - 1));
        continue;
      }
      logger.error({ err, to: maskEmail(to) }, "email send failed");
      throw new EmailError("Could not send email", { cause: err });
    }
  }
};

/**
 * Send without making the HTTP request wait for the provider.
 * Failures are logged, never thrown, so a mail outage can't break signup.
 * Trade-off: an email in flight is lost if the process crashes. For stronger
 * guarantees, persist a job (outbox table or BullMQ) and send from a worker.
 */
export const sendInBackground = (to: string, content: EmailContent): void => {
  void sendEmail(to, content).catch(() => {
    /* already logged inside sendEmail */
  });
};

/* ------------------------------ use-case API ----------------------------- */

export const sendVerificationEmail = (to: string, name: string, token: string): void =>
  sendInBackground(
    to,
    verificationEmail({
      name,
      verifyUrl: `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`,
      expiresInHours: VERIFY_EXPIRES_HOURS,
    }),
  );

export const sendPasswordResetEmail = (to: string, name: string, token: string): void =>
  sendInBackground(
    to,
    passwordResetEmail({
      name,
      resetUrl: `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`,
      expiresInMinutes: RESET_EXPIRES_MINUTES,
    }),
  );

export const TOKEN_TTL = {
  verifyMs: VERIFY_EXPIRES_HOURS * 60 * 60 * 1000,
  resetMs: RESET_EXPIRES_MINUTES * 60 * 1000,
};
