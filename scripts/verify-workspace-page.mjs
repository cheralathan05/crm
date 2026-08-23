// Verifies the /onboarding/workspace page server-renders for a user in setup.
const BASE = "http://localhost:3000";
const EMAIL = "ob-1786477577332@example.com";
const PASS = "OnboardPass123";

async function login() {
  const jar = new Map();
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";");
    const [k, v] = pair.split("=");
    jar.set(k.trim(), v ?? "");
  }
  return async (path, init = {}) => {
    const cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    return fetch(`${BASE}${path}`, {
      ...init,
      headers: { ...(init.headers ?? {}), Cookie: cookie },
      redirect: "manual",
    });
  };
}

const api = await login();
await api("/api/onboarding/overview", { method: "POST" });

const res = await api("/onboarding/workspace");
const html = await res.text();

const checks = [
  ["status 200", res.status === 200],
  ["Welcome name renders", html.includes("Welcome,")],
  ["configures your workspace", html.includes("configure your workspace")],
  ["workspace setup label", html.includes("Workspace setup")],
  ["progress 01 IDENTITY", html.includes("IDENTITY")],
  ["progress 06 PREFERENCES", html.includes("PREFERENCES")],
  ["app navbar present", html.includes("Sign out")],
];

let pass = 0;
let fail = 0;
for (const [name, ok] of checks) {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`); }
}
console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
