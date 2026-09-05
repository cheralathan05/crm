/* eslint-disable @typescript-eslint/no-require-imports */
// Dev diagnostic: verify SMTP auth WITHOUT sending any mail.
// Prints only safe diagnostics (never credentials).
const fs = require("fs");
const nodemailer = require("nodemailer");

const t = fs.readFileSync(".env", "utf8");
const g = (keys) => {
  for (const k of keys) {
    const m = t.match(new RegExp("^" + k + "=(.*)$", "m"));
    if (m && m[1].trim()) return m[1].trim();
  }
  return undefined;
};

const host = g(["EMAIL_HOST", "SMTP_HOST"]);
const port = Number(g(["EMAIL_PORT", "SMTP_PORT"]) || 587);
const user = g(["EMAIL_USER", "SMTP_USER"]);
const pass = g(["EMAIL_PASSWORD", "EMAIL_PASS", "SMTP_PASS"]);
const secure = g(["EMAIL_SECURE", "SMTP_SECURE"]) === "true";

if (!host || !user || !pass) {
  console.log("RESULT: SMTP_CONFIG_INCOMPLETE (no host/user/pass)");
  process.exit(0);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

transporter
  .verify()
  .then(() => {
    console.log("RESULT: SMTP_AUTH_OK");
  })
  .catch((err) => {
    const msg = String(err && err.message ? err.message : err);
    let category = "SMTP_UNKNOWN_ERROR";
    if (/invalid login|535|auth/i.test(msg)) category = "SMTP_AUTH_FAILED";
    else if (/timed out|ETIMEDOUT|ESOCKET/i.test(msg)) category = "SMTP_TIMEOUT";
    else if (/connect|ECONNREFUSED|ENOTFOUND/i.test(msg)) category = "SMTP_CONNECT_FAILED";
    else if (/TLS|STARTTLS|handshake/i.test(msg)) category = "SMTP_TLS_ERROR";
    console.log("RESULT: " + category);
    console.log("DETAIL: " + msg.split("\n")[0].slice(0, 200));
  })
  .finally(() => process.exit(0));
