// Verifies the Workspace Creation Engine over real HTTP:
// autosave/resume, per-user isolation, final transaction, routing.
import fs from "node:fs";

const BASE = "http://localhost:3000";
const LOG = process.env.BOS_DEV_LOG ?? "C:\\Users\\chera\\AppData\\Local\\Temp\\bos-dev.log";

let pass = 0;
let fail = 0;
function check(name, ok, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} ${detail}`);
  }
}

async function waitForToken(email, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const content = fs.readFileSync(LOG, "utf8");
    const line = content.split("\n").find((l) => l.includes(email) && l.includes("Verify your account"));
    if (line) {
      const m = line.match(/token=([A-Za-z0-9_-]+)/);
      if (m) return m[1];
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

async function signupAndVerify(email) {
  const signup = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Engine Tester",
      companyName: "Prefill",
      email,
      password: "EnginePass123",
      confirmPassword: "EnginePass123",
    }),
  });
  if (signup.status !== 201) return null;
  const token = await waitForToken(email);
  if (!token) return null;
  await fetch(`${BASE}/api/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return token;
}

async function sessionFor(email, password) {
  const jar = new Map();
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookies) {
    const [pair] = c.split(";");
    const [k, v] = pair.split("=");
    if (k) jar.set(k.trim(), v ?? "");
  }
  return async (path, init = {}) => {
    const cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    const headers = { ...(init.headers ?? {}), Cookie: cookie };
    return fetch(`${BASE}${path}`, { ...init, headers, redirect: "manual" });
  };
}

const USER_A = `engine-a-${Date.now()}@example.com`;
const USER_B = `engine-b-${Date.now()}@example.com`;
const PASS = "EnginePass123";

console.log("== create users ==");
await signupAndVerify(USER_A);
await signupAndVerify(USER_B);

const A = await sessionFor(USER_A, PASS);
const B = await sessionFor(USER_B, PASS);

// Both users complete the overview so they land in the setup flow.
await A("/api/onboarding/overview", { method: "POST" });
await B("/api/onboarding/overview", { method: "POST" });

console.log("== USER A — initial state ==");
let res = await A("/api/onboarding");
let data = await res.json();
check("A next=/onboarding/workspace (overview done)", data.next === "/onboarding/workspace", JSON.stringify(data.next));

res = await A("/api/onboarding");
data = await res.json();
check("A next=/onboarding/workspace", data.next === "/onboarding/workspace", JSON.stringify(data.next));

console.log("== USER A — resume before any save ==");
res = await A("/api/onboarding/workspace");
data = await res.json();
check("A config is null (fresh)", data.config === null, JSON.stringify(data.config));

console.log("== USER A — autosave step 1 (identity) ==");
res = await A("/api/onboarding/workspace", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ companyName: "ABC Technologies" }),
});
data = await res.json();
check("autosave 200", res.status === 200, String(res.status));
check("companyName persisted", data.config?.companyName === "ABC Technologies", JSON.stringify(data.config?.companyName));

console.log("== USER A — autosave step 2-4 (business + team + work) ==");
res = await A("/api/onboarding/workspace", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    business: { industry: "Software & Technology", services: ["Web Development", "AI Automation"] },
    setup: { leadSources: ["Client inquiry", "Referral"], approvalFlow: ["Proposal approval"], executionMode: "Projects", teamSize: "11–25", roles: ["Founder", "Frontend", "Backend"], workTypes: ["Web Development"], projectDuration: "3–6 months", clientVolume: "3–5 at a time", currentTools: ["Spreadsheet", "Email"] },
    preferences: { theme: "DARK", defaultLanding: "Overview", timezone: "Asia/Kolkata", dateFormat: "DD/MM/YYYY" },
  }),
});
data = await res.json();
check("autosave full 200", res.status === 200, String(res.status));
check("business persisted", data.config?.business?.industry === "Software & Technology");
check("team persisted", data.config?.setup?.teamSize === "11–25");
check("roles persisted", Array.isArray(data.config?.setup?.roles) && data.config.setup.roles.length === 3);

console.log("== USER A — resume reads full config ==");
res = await A("/api/onboarding/workspace");
data = await res.json();
check("resume companyName", data.config?.companyName === "ABC Technologies");
check("resume workflow", data.config?.setup?.leadSources?.length === 2);

console.log("== USER A — state machine mid-setup ==");
res = await A("/api/onboarding");
data = await res.json();
check("A still next=/onboarding/workspace (not dashboard)", data.next === "/onboarding/workspace", JSON.stringify(data.next));

console.log("== USER B — isolation: empty config ==");
res = await B("/api/onboarding/workspace");
data = await res.json();
check("B config null (A's data invisible)", data.config === null, JSON.stringify(data.config));

console.log("== USER B — different company ==");
await B("/api/onboarding/workspace", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ companyName: "XYZ Solutions", business: { industry: "Marketing Agency" } }),
});
res = await A("/api/onboarding/workspace");
data = await res.json();
check("A still sees ABC Technologies", data.config?.companyName === "ABC Technologies", JSON.stringify(data.config?.companyName));
res = await B("/api/onboarding/workspace");
data = await res.json();
check("B sees XYZ Solutions", data.config?.companyName === "XYZ Solutions");

console.log("== USER A — final transaction ==");
res = await A("/api/onboarding/workspace/complete", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ companyName: "ABC Technologies" }),
});
data = await res.json();
check("complete 200", res.status === 200, String(res.status));
check("complete next=/dashboard", data.next === "/dashboard", JSON.stringify(data.next));

res = await A("/api/onboarding");
data = await res.json();
check("A next=/dashboard after complete", data.next === "/dashboard", JSON.stringify(data.next));

console.log("== USER A — dashboard renders own workspace ==");
res = await A("/dashboard");
const html = await res.text();
check("dashboard 200", res.status === 200, String(res.status));
check("dashboard shows ABC Technologies", html.includes("ABC Technologies"), "company missing from html");

console.log("== USER B — still in setup ==");
res = await B("/api/onboarding");
data = await res.json();
check("B next=/onboarding/workspace (isolated state)", data.next === "/onboarding/workspace", JSON.stringify(data.next));

console.log("== guards ==");
res = await A("/onboarding/workspace");
check("A /onboarding/workspace redirects (307)", res.status === 307, String(res.status));
res = await B("/onboarding/overview", { method: undefined });
check("B /onboarding/overview redirects (overview done → setup)", res.status === 307, String(res.status));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
