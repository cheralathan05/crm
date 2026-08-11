// Creates a verified test user via the real auth API, extracting the
// verification token from the dev log (SMTP is pointed at a dead address).
import fs from "node:fs";

const BASE = "http://localhost:3000";
const LOG = process.env.BOS_DEV_LOG ?? "C:\\Users\\chera\\AppData\\Local\\Temp\\bos-dev.log";
const email = `ob-${Date.now()}@example.com`;
const password = "OnboardPass123";

async function waitForToken(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const content = fs.readFileSync(LOG, "utf8");
    const line = content.split("\n").find((l) => l.includes(email) && l.includes("Verify your account"));
    if (line) {
      const m = line.match(/token=([A-Za-z0-9_-]+)/);
      if (m) return m[1];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

const signup = await fetch(`${BASE}/api/auth/signup`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    fullName: "Onboarding Tester",
    companyName: "Prefill Corp",
    email,
    password,
    confirmPassword: password,
  }),
});
const signupJson = await signup.json();
console.log("signup:", signup.status, signupJson.code ?? signupJson.message);

const token = await waitForToken();
if (!token) {
  console.log("FAIL: no verification token captured");
  process.exit(1);
}

const verify = await fetch(`${BASE}/api/auth/verify-email`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token }),
});
console.log("verify:", verify.status, (await verify.json()).code);

console.log("EMAIL=" + email);
console.log("PASSWORD=" + password);
