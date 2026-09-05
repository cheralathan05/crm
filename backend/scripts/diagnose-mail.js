/* eslint-disable @typescript-eslint/no-require-imports */
// Comprehensive Mail Server Diagnostic Tool
const fs = require("fs");
const path = require("path");
const net = require("net");
const nodemailer = require("nodemailer");

function loadEnv() {
  const envMap = {};
  for (const file of [".env", ".env.local"]) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          envMap[key] = val;
        }
      }
    }
  }
  return envMap;
}

const envVars = loadEnv();
const g = (...keys) => {
  for (const k of keys) {
    if (envVars[k] && envVars[k].trim() !== "") return envVars[k].trim();
  }
  return undefined;
};

async function main() {
  console.log("=========================================");
  console.log("  BUSINESS OS — MAIL SYSTEM DIAGNOSTIC  ");
  console.log("=========================================\n");

  const resendKey = g("RESEND_API_KEY");
  const host = g("EMAIL_HOST", "SMTP_HOST");
  const port = Number(g("EMAIL_PORT", "SMTP_PORT") || (host === "smtp.gmail.com" ? 587 : 587));
  const user = g("EMAIL_USER", "SMTP_USER");
  const pass = g("EMAIL_PASSWORD", "EMAIL_PASS", "SMTP_PASS");
  const secureEnv = g("EMAIL_SECURE", "SMTP_SECURE");
  const secure = secureEnv !== undefined ? secureEnv === "true" : port === 465;
  const from = g("EMAIL_FROM", "MAIL_FROM") || (user ? `Business OS <${user}>` : undefined);

  if (resendKey) {
    console.log("[Channel] Resend API detected");
    console.log("  RESEND_API_KEY: Present (starts with " + resendKey.slice(0, 6) + "...)");
    console.log("  RESEND_FROM:    " + (g("RESEND_FROM") || "Business OS <onboarding@resend.dev>"));
    console.log("\n[Status] Configuration is ready for Resend transactional sending.");
    return;
  }

  if (host) {
    console.log("[Channel] SMTP Server detected");
    console.log("  HOST:    " + host);
    console.log("  PORT:    " + port);
    console.log("  SECURE:  " + secure + " (SSL/TLS)");
    console.log("  USER:    " + (user ? user : "MISSING (Set EMAIL_USER)"));
    console.log("  PASS:    " + (pass ? "Present (Hidden)" : "MISSING (Set EMAIL_PASSWORD)"));
    console.log("  FROM:    " + (from || "Default"));

    if (!user || !pass) {
      console.log("\n[Status] INCOMPLETE: Missing EMAIL_USER or EMAIL_PASSWORD in .env.");
      return;
    }

    console.log("\n[1/2] Testing TCP Network Connectivity to " + host + ":" + port + "...");
    const canConnect = await new Promise((resolve) => {
      const sock = net.createConnection({ host, port });
      sock.setTimeout(10000, () => {
        console.log("  ❌ TCP Connection timed out after 10s");
        sock.destroy();
        resolve(false);
      });
      sock.on("connect", () => {
        console.log("  ✅ TCP Connection successful!");
        sock.destroy();
        resolve(true);
      });
      sock.on("error", (err) => {
        console.log("  ❌ Connection error: " + err.message);
        resolve(false);
      });
    });

    if (!canConnect) {
      console.log("\n[Status] FAILED: Could not reach SMTP host on port " + port + ".");
      return;
    }

    console.log("\n[2/2] Testing SMTP Handshake & Authentication...");
    const isGmail = /gmail\.com$/i.test(host);
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
      tls: {
        rejectUnauthorized: g("EMAIL_REJECT_UNAUTHORIZED", "SMTP_REJECT_UNAUTHORIZED") !== "false",
      },
      ...(isGmail ? { service: "gmail" } : {}),
    });

    try {
      await transporter.verify();
      console.log("  ✅ SMTP Authentication verified successfully!");
      console.log("\n[Status] READY: Email server is active and ready to send messages.");
    } catch (err) {
      console.log("  ❌ SMTP Authentication failed!");
      console.log("  Error Detail: " + err.message);
      if (/535|invalid login|Username and Password not accepted/i.test(err.message)) {
        console.log("\n  👉 NOTE FOR GMAIL USERS:");
        console.log("     If using Gmail, regular Google passwords will not work.");
        console.log("     You must generate a 16-character 'App Password':");
        console.log("     1. Go to https://myaccount.google.com/security");
        console.log("     2. Ensure 2-Step Verification is ON");
        console.log("     3. Search 'App Passwords' and create one for 'Mail'");
        console.log("     4. Paste the 16-character code as EMAIL_PASSWORD in .env");
      }
    }
    return;
  }

  console.log("[Status] NO MAIL SERVER CONFIGURED");
  console.log("Neither Resend nor SMTP environment variables are present in .env or .env.local.");
  console.log("\n------------------------------------------------------------");
  console.log("Option 1: Setup Gmail SMTP (Quickest)");
  console.log("Add the following lines to your .env file:\n");
  console.log('EMAIL_HOST="smtp.gmail.com"');
  console.log('EMAIL_PORT="587"');
  console.log('EMAIL_USER="your-email@gmail.com"');
  console.log('EMAIL_PASSWORD="your-16-char-google-app-password"');
  console.log('EMAIL_FROM="Business OS <your-email@gmail.com>"');
  console.log("\nOption 2: Setup Resend (Transactional API)");
  console.log("Add the following lines to your .env file:\n");
  console.log('RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxx"');
  console.log('RESEND_FROM="Business OS <onboarding@resend.dev>"');
  console.log("------------------------------------------------------------\n");
}

main().catch((err) => console.error("Diagnostic error:", err));
