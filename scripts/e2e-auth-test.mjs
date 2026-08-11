// End-to-end auth test. Requires the dev server running on :3000 with
// EMAIL_HOST pointed at an unreachable address so mail.ts logs [mail:dev] links.
import Database from "better-sqlite3";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const db = new Database("dev.db", { readonly: false });
// git-bash /tmp maps to AppData\Local\Temp on Windows
const LOG =
  process.env.BOS_DEV_LOG ??
  "C:\\Users\\chera\\AppData\\Local\\Temp\\bos-dev.log";

let passed = 0;
let failed = 0;
const failures = [];

// Pre-cleanup any leftovers from aborted runs.
db.prepare(
  "DELETE FROM VerificationToken WHERE userId IN (SELECT id FROM User WHERE email LIKE 'e2e-%' OR email LIKE 'lockout-%')",
).run();
db.prepare("DELETE FROM User WHERE email LIKE 'e2e-%' OR email LIKE 'lockout-%'").run();

function check(name, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`PASS  ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`FAIL  ${name}${extra ? " — " + extra : ""}`);
  }
}

async function api(method, path, body, cookie) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 90000);
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: "manual",
      signal: controller.signal,
    });
    let json = null;
    try {
      json = await res.json();
    } catch {
      /* non-JSON */
    }
    const setCookie = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    return { status: res.status, json, cookie: setCookie.join("; ") };
  } finally {
    clearTimeout(t);
  }
}

function readTokensFromLog(email) {
  const content = fs.readFileSync(LOG, "utf8");
  const lines = content.split("\n").filter((l) => l.includes(email));
  const out = [];
  for (const line of lines) {
    const m = line.match(/url=[^ ]*?[?&]token=([A-Za-z0-9_-]+)/);
    if (m) out.push({ line, token: m[1] });
  }
  return out;
}

async function waitForToken(email, type, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const hits = readTokensFromLog(email);
    for (const h of hits) {
      if (h.line.includes(type)) return h.token;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

function dbUser(email) {
  return db.prepare("SELECT * FROM User WHERE email = ?").get(email);
}
function dbTokens(userId) {
  return db.prepare("SELECT * FROM VerificationToken WHERE userId = ?").all(userId);
}

const email = `e2e-${Date.now()}@example.com`;
const password = "SecurePass123";
const newPassword = "NewSecurePass456";

console.log(`\n=== E2E AUTH TEST — ${email} ===\n`);

// 0. Health endpoint
{
  const r = await api("GET", "/api/health/email");
  check("health/email reachable", r.status === 200, `status=${r.status}`);
  check("health/email reports smtp channel", r.json?.channel === "smtp", JSON.stringify(r.json));
}

// 1. Signup
{
  const r = await api("POST", "/api/auth/signup", {
    fullName: "E2E Test User",
    companyName: "E2E Corp",
    email,
    password,
    confirmPassword: password,
  });
  check("signup returns 201 ACCOUNT_CREATED", r.status === 201 && r.json?.code === "ACCOUNT_CREATED", `${r.status} ${JSON.stringify(r.json)}`);
}

// 2. DB persistence after signup
{
  const u = dbUser(email);
  check("user row persisted", !!u);
  check("passwordHash stored (bcrypt)", !!u?.passwordHash && u.passwordHash.startsWith("$2"));
  check("emailVerified is null", u?.emailVerified === null);
  check("role defaults to OWNER", u?.role === "OWNER");
  check("status defaults to ACTIVE", u?.status === "ACTIVE");
  check("provider defaults to EMAIL", u?.provider === "EMAIL");
  check("sessionVersion defaults to 1", u?.sessionVersion === 1);
  const tokens = u ? dbTokens(u.id) : [];
  const vt = tokens.find((t) => t.type === "EMAIL_VERIFICATION");
  check("verification token stored (hash only)", !!vt && /^[0-9a-f]{64}$/.test(vt.tokenHash));
  check("verification token not used yet", vt?.usedAt === null);
}

// 3. Verify email
const vt = await waitForToken(email, "Verify your account");
check("verification token captured from dev log", !!vt);
if (vt) {
  const r = await api("POST", "/api/auth/verify-email", { token: vt });
  check("verify-email returns VERIFIED", r.json?.code === "VERIFIED", `${r.status} ${JSON.stringify(r.json)}`);
}

// 4. DB after verify
{
  const u = dbUser(email);
  check("emailVerified set after verify", !!u?.emailVerified);
  const tokens = u ? dbTokens(u.id) : [];
  const vt = tokens.find((t) => t.type === "EMAIL_VERIFICATION");
  check("token marked used", !!vt?.usedAt);
}

// 5. Token reuse + invalid token
if (vt) {
  const reuse = await api("POST", "/api/auth/verify-email", { token: vt });
  check("token reuse → ALREADY_VERIFIED", reuse.json?.code === "ALREADY_VERIFIED", JSON.stringify(reuse.json));
}
{
  const bad = await api("POST", "/api/auth/verify-email", { token: "not-a-real-token" });
  check("garbage token → INVALID_TOKEN", bad.status === 400 && bad.json?.code === "INVALID_TOKEN", `${bad.status} ${JSON.stringify(bad.json)}`);
}

// 6. Login failures
{
  const wrong = await api("POST", "/api/auth/login", { email, password: "WrongPass123" });
  check("wrong password → 401", wrong.status === 401, `${wrong.status} ${JSON.stringify(wrong.json)}`);
  const unknown = await api("POST", "/api/auth/login", { email: "ghost-" + email, password: "Whatever123" });
  check("unknown email → 401 (no enumeration)", unknown.status === 401, `${unknown.status} ${JSON.stringify(unknown.json)}`);
}

// 7. Login success
let cookie = "";
{
  const r = await api("POST", "/api/auth/login", { email, password });
  check("correct login → 200", r.status === 200, `${r.status} ${JSON.stringify(r.json)}`);
  cookie = r.cookie;
  check("session cookie set (httpOnly)", /authjs\.session-token=/i.test(cookie) && /HttpOnly/i.test(cookie), cookie.slice(0, 120));
}

// 8. /api/auth/me with session
{
  const r = await api("GET", "/api/auth/me", undefined, cookie);
  check("me returns user", r.status === 200 && r.json?.ok, `${r.status} ${JSON.stringify(r.json)}`);
  check("me returns normalized DB id", typeof r.json?.user?.id === "string" && r.json.user.id.length > 10);
  check("me returns role/status", r.json?.user?.role === "OWNER" && r.json?.user?.status === "ACTIVE", JSON.stringify(r.json?.user));
}

// 9. Forgot password
{
  const r = await api("POST", "/api/auth/forgot-password", { email });
  check("forgot-password → generic success", r.status === 200 && r.json?.ok, `${r.status} ${JSON.stringify(r.json)}`);
  const ghost = await api("POST", "/api/auth/forgot-password", { email: "nobody-" + email });
  check("forgot-password unknown email → same generic response", ghost.status === 200 && ghost.json?.ok && ghost.json.message === r.json.message);
}

// 10. Reset token in DB + reset password
const rt = await waitForToken(email, "Reset your password");
check("reset token captured from dev log", !!rt);
{
  const u = dbUser(email);
  const tokens = u ? dbTokens(u.id) : [];
  const rToken = tokens.find((t) => t.type === "PASSWORD_RESET");
  check("reset token stored hashed", !!rToken && /^[0-9a-f]{64}$/.test(rToken.tokenHash));
  check("reset token has future expiry", !!rToken && new Date(rToken.expiresAt) > new Date());
  check("reset token not used", rToken?.usedAt === null);
}
let resetOk = false;
if (rt) {
  const r = await api("POST", "/api/auth/reset-password", { token: rt, password: newPassword, confirmPassword: newPassword });
  resetOk = r.json?.code === "PASSWORD_UPDATED";
  check("reset-password → PASSWORD_UPDATED", resetOk, `${r.status} ${JSON.stringify(r.json)}`);
}

// 11. Session revocation after password reset
{
  const r = await api("GET", "/api/auth/me", undefined, cookie);
  check("old session revoked after password reset", r.status === 401, `status=${r.status}`);
  const u = dbUser(email);
  check("sessionVersion incremented", u?.sessionVersion === 2, `version=${u?.sessionVersion}`);
}

// 12. Login with new password, old password rejected
{
  const r = await api("POST", "/api/auth/login", { email, password: newPassword });
  check("login with new password → 200", r.status === 200, `${r.status} ${JSON.stringify(r.json)}`);
  const old = await api("POST", "/api/auth/login", { email, password });
  check("old password rejected", old.status === 401, `status=${old.status}`);
}

// 13. Duplicate signup (verified account)
{
  const r = await api("POST", "/api/auth/signup", {
    fullName: "Duplicate",
    companyName: "Acme Corp",
    email,
    password,
    confirmPassword: password,
  });
  check("duplicate verified signup → 409 EMAIL_EXISTS", r.status === 409 && r.json?.code === "EMAIL_EXISTS", `${r.status} ${JSON.stringify(r.json)}`);
}

// 14. Rate limiting (IP) on login
{
  let got429 = false;
  let last = null;
  for (let i = 0; i < 12; i++) {
    last = await api("POST", "/api/auth/login", { email, password: "BurstPass123" });
    if (last.status === 429) {
      got429 = true;
      break;
    }
  }
  check("login rate limit → 429 after burst", got429, `last=${last?.status} ${JSON.stringify(last?.json)}`);
}

// 15. Per-account brute-force lockout
{
  const victim = `lockout-${Date.now()}@example.com`;
  await api("POST", "/api/auth/signup", {
    fullName: "Lockout",
    companyName: "X",
    email: victim,
    password,
    confirmPassword: password,
  });
  let last = null;
  for (let i = 0; i < 6; i++) {
    last = await api("POST", "/api/auth/login", { email: victim, password: "WrongPass123" });
  }
  check("failed-attempt lockout → 429 on 6th", last?.status === 429, `status=${last?.status} ${JSON.stringify(last?.json)}`);
  // cleanup
  const v = db.prepare("SELECT id FROM User WHERE email = ?").get(victim);
  if (v) {
    db.prepare("DELETE FROM VerificationToken WHERE userId = ?").run(v.id);
    db.prepare("DELETE FROM User WHERE id = ?").run(v.id);
  }
}

// 16. Logout
{
  const fresh = await api("POST", "/api/auth/login", { email, password: newPassword });
  const freshCookie = fresh.cookie;
  const out = await api("POST", "/api/auth/logout", undefined, freshCookie);
  check("logout → ok", out.status === 200 && out.json?.ok, `${out.status} ${JSON.stringify(out.json)}`);
}

// 17. Cleanup test user
{
  const u = dbUser(email);
  if (u) {
    db.prepare("DELETE FROM VerificationToken WHERE userId = ?").run(u.id);
    db.prepare("DELETE FROM User WHERE id = ?").run(u.id);
  }
  check("test user cleaned up", !dbUser(email));
}

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
if (failures.length) {
  console.log("Failures:");
  for (const f of failures) console.log("  - " + f);
}

try {
  db.close();
} catch {}
process.exit(failed ? 1 : 0);
