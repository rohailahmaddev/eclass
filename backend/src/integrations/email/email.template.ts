import { env } from "../../config/env.js";
import { EmailContent } from "./email.type.js";

const APP_NAME = env.APP_NAME ?? "eClass";

/** User-controlled values (names) must be escaped before going into HTML. */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const layout = (opts: {
  preheader: string;
  heading: string;
  bodyHtml: string;
  buttonLabel: string;
  buttonUrl: string;
  footerNote: string;
}): string => {
  const url = escapeHtml(opts.buttonUrl);
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:8px;padding:32px;">
            <tr><td style="font-size:20px;font-weight:700;padding-bottom:16px;">${escapeHtml(APP_NAME)}</td></tr>
            <tr><td style="font-size:18px;font-weight:600;padding-bottom:12px;">${escapeHtml(opts.heading)}</td></tr>
            <tr><td style="font-size:15px;line-height:1.6;padding-bottom:24px;">${opts.bodyHtml}</td></tr>
            <tr>
              <td style="padding-bottom:24px;">
                <a href="${url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;">${escapeHtml(opts.buttonLabel)}</a>
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;line-height:1.5;color:#6b7280;">
                If the button doesn't work, copy this link into your browser:<br />
                <span style="word-break:break-all;">${url}</span>
              </td>
            </tr>
            <tr><td style="font-size:13px;line-height:1.5;color:#6b7280;padding-top:16px;">${escapeHtml(opts.footerNote)}</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

export const verificationEmail = (params: {
  name: string;
  verifyUrl: string;
  expiresInHours: number;
}): EmailContent => {
  const { name, verifyUrl, expiresInHours } = params;
  return {
    subject: `Verify your email for ${APP_NAME}`,
    html: layout({
      preheader: "Confirm your email address to finish creating your account.",
      heading: "Confirm your email address",
      bodyHtml: `Hi ${escapeHtml(name)},<br /><br />Thanks for signing up. Please confirm your email address to activate your account. This link expires in ${expiresInHours} hours.`,
      buttonLabel: "Verify email",
      buttonUrl: verifyUrl,
      footerNote: "If you didn't create an account, you can safely ignore this email.",
    }),
    text: [
      `Hi ${name},`,
      "",
      `Thanks for signing up for ${APP_NAME}. Confirm your email address using the link below (expires in ${expiresInHours} hours):`,
      verifyUrl,
      "",
      "If you didn't create an account, you can safely ignore this email.",
    ].join("\n"),
  };
};

export const passwordResetEmail = (params: {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}): EmailContent => {
  const { name, resetUrl, expiresInMinutes } = params;
  return {
    subject: `Reset your ${APP_NAME} password`,
    html: layout({
      preheader: "Use this link to choose a new password.",
      heading: "Reset your password",
      bodyHtml: `Hi ${escapeHtml(name)},<br /><br />We received a request to reset your password. This link expires in ${expiresInMinutes} minutes and can only be used once.`,
      buttonLabel: "Reset password",
      buttonUrl: resetUrl,
      footerNote: "If you didn't request this, you can ignore this email. Your password won't change.",
    }),
    text: [
      `Hi ${name},`,
      "",
      `We received a request to reset your ${APP_NAME} password. Use the link below (expires in ${expiresInMinutes} minutes, single use):`,
      resetUrl,
      "",
      "If you didn't request this, you can ignore this email. Your password won't change.",
    ].join("\n"),
  };
};
