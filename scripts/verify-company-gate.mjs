import Database from "better-sqlite3";

const BASE = "http://localhost:3000";
const email = `gate-${Date.now()}@example.com`;
const password = "GatePass123";
const db = new Database("dev.db", { readonly: false });

// 1. Signup
const signup = await fetch(`${BASE}/api/auth/signup`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    fullName: "Gate Tester",
    companyName: "Gate Corp",
    email,
    password,
    confirmPassword: password,
  }),
});
console.log("signup:", signup.status);

// 2. Force-verify in the DB (email delivery is not the point of this test)
const user = db.prepare("SELECT id FROM User WHERE email = ?").get(email);
db.prepare("UPDATE User SET emailVerified = ? WHERE id = ?").run(new Date().toISOString(), user.id);

// 3. Login
const login = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
console.log("login:", login.status);
// Capture every Set-Cookie (session token + csrf) into a cookie string.
const setCookies =
  typeof login.headers.getSetCookie === "function"
    ? login.headers.getSetCookie()
    : [login.headers.get("set-cookie") ?? ""];
const cookie = setCookies.map((c) => c.split(";")[0]).join("; ");
console.log("cookies captured:", setCookies.map((c) => c.split(";")[0].split("=")[0]).join(", "));

// 4. Company page with overview incomplete → must redirect to /onboarding/overview
const company = await fetch(`${BASE}/onboarding/company`, {
  headers: { Cookie: cookie },
  redirect: "manual",
});
console.log(
  "company page (overview incomplete):",
  company.status,
  "location:",
  company.headers.get("location") ?? "(none)",
);

// 5. Overview page should render (200)
const overview = await fetch(`${BASE}/onboarding/overview`, {
  headers: { Cookie: cookie },
  redirect: "manual",
});
console.log("overview page:", overview.status);

// Cleanup
db.prepare("DELETE FROM VerificationToken WHERE userId = ?").run(user.id);
db.prepare("DELETE FROM Onboarding WHERE userId = ?").run(user.id);
db.prepare("DELETE FROM Workspace WHERE ownerId = ?").run(user.id);
db.prepare("DELETE FROM User WHERE id = ?").run(user.id);
db.close();
console.log("cleanup done");
