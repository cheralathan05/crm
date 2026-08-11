import "dotenv/config";
import { sendTestEmail, emailConfigStatus } from "../src/lib/mail";

async function main() {
  // Sends ONE real test email to the configured EMAIL_USER address to prove
  // the full SMTP path works with the corrected Gmail sender logic.
  const to = process.env.EMAIL_USER ?? process.env.SMTP_USER;

  if (!to) {
    console.log("RESULT: NO_RECIPIENT (EMAIL_USER not set)");
    return;
  }

  console.log("CONFIG:", JSON.stringify(emailConfigStatus()));
  console.log("TO:", to);

  const result = await sendTestEmail(to);
  console.log(result.sent ? "RESULT: DELIVERY_OK" : "RESULT: DELIVERY_FAILED");
  process.exit(result.sent ? 0 : 1);
}

main().catch((err) => {
  console.error("RESULT: DELIVERY_FAILED", err);
  process.exit(1);
});
