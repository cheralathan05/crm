/* eslint-disable @typescript-eslint/no-require-imports */
// Dev diagnostic: verify EMAIL_* / SMTP_* configuration reachability only.
// Prints host/port and reachability status. Does NOT send mail or print secrets.
const fs = require("fs");
const net = require("net");

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

console.log("EMAIL_HOST:", host ?? "(unset)");
console.log("EMAIL_PORT:", port);
console.log("EMAIL_USER:", user ? "(set)" : "(unset)");
console.log("EMAIL_PASS:", pass ? "(set)" : "(unset)");

if (!host) {
  console.log("RESULT: no SMTP host configured — mail() falls back to dev-logging or Resend.");
  process.exit(0);
}

const sock = net.createConnection({ host, port });
sock.setTimeout(8000, () => {
  console.log("RESULT: SMTP_UNREACHABLE (connection timed out)");
  sock.destroy();
  process.exit(0);
});
sock.on("connect", () => {
  console.log("RESULT: SMTP_PORT_REACHABLE");
  sock.destroy();
  process.exit(0);
});
sock.on("error", (e) => {
  console.log("RESULT: SMTP_UNREACHABLE (" + e.code + ")");
  process.exit(0);
});
