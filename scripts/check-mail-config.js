/* eslint-disable @typescript-eslint/no-require-imports */
// Dev diagnostic: detect the classic Gmail "sender not owned by account" failure.
// Prints only booleans — never the actual values.
const fs = require("fs");
const t = fs.readFileSync(".env", "utf8");
const g = (keys) => {
  for (const k of keys) {
    const m = t.match(new RegExp("^" + k + "=(.*)$", "m"));
    if (m && m[1].trim()) return m[1].trim();
  }
  return undefined;
};

const host = g(["EMAIL_HOST", "SMTP_HOST"]);
const user = g(["EMAIL_USER", "SMTP_USER"]);
const from = g(["EMAIL_FROM", "MAIL_FROM"]);
const secure = g(["EMAIL_SECURE", "SMTP_SECURE"]);

console.log("IS_GMAIL:", /gmail\.com/i.test(host || ""));
console.log("FROM_EQUALS_USER:", !!from && !!user && from.toLowerCase() === user.toLowerCase());
console.log("FROM_SET:", !!from);
console.log("EMAIL_SECURE_SET:", !!secure);

if (/gmail\.com/i.test(host || "") && from && user && from.toLowerCase() !== user.toLowerCase()) {
  console.log(
    "WARNING: Gmail SMTP requires the From address to be the authenticated account. " +
      "Set EMAIL_FROM to the same address as EMAIL_USER, otherwise Gmail rejects the message.",
  );
}
