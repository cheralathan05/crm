import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** All authenticated application routes (dashboard modules + employee OS + onboarding). */
const PROTECTED_ROUTES = [
  "/dashboard",
  "/onboarding",
  "/employee/onboarding",
  "/employee/work",
  "/clients",
  "/requirements",
  "/proposals",
  "/projects",
  "/tasks",
  "/employees",
  "/messages",
  "/documents",
  "/payments",
  "/automations",
  "/analytics",
  "/github",
  "/settings",
];

/** Routes restricted to OWNER/ADMIN — enforced here, not just hidden in UI. */
const STAFF_ONLY_ROUTES = [
  "/dashboard",
  "/clients",
  "/requirements",
  "/proposals",
  "/employees",
  "/payments",
  "/automations",
  "/analytics",
];

function matches(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(prefix + "/");
}

/**
 * Business OS — Production Edge Proxy (Next.js 16 convention)
 *
 * Protects authenticated routes, enforces RBAC boundaries, redirects authenticated users
 * away from public auth pages, and permits public client portals and health checks.
 */
export default async function proxy(req: NextRequest) {
  const session = await auth();
  const path = req.nextUrl.pathname;

  // Static assets & system endpoints — always pass through
  const isStatic =
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path.startsWith("/images") ||
    path.startsWith("/manifest") ||
    path === "/sw.js" ||
    path === "/";

  // Auth, webhooks & health API routes
  const isExemptApi =
    path.startsWith("/api/auth") ||
    path.startsWith("/api/health") ||
    path.startsWith("/api/readiness") ||
    path.startsWith("/api/liveness") ||
    path.startsWith("/health") ||
    path.startsWith("/readiness") ||
    path.startsWith("/liveness") ||
    path.startsWith("/api/public") ||
    path.startsWith("/api/realtime") ||
    path.startsWith("/api/payments/webhook");

  if (isStatic || isExemptApi) {
    return NextResponse.next();
  }

  // Public portal routes that unauthenticated clients may access
  const isPublicPortalRoute =
    path.startsWith("/pay") ||
    path.startsWith("/client-proposal") ||
    path.startsWith("/client-question") ||
    path.startsWith("/client-requirement") ||
    path.startsWith("/invite") ||
    path.startsWith("/accept-invitation");

  if (isPublicPortalRoute) {
    return NextResponse.next();
  }

  // Public auth pages (login, signup, reset password)
  const isAuthPage =
    path === "/login" ||
    path === "/signup" ||
    path === "/forgot-password" ||
    path === "/reset-password" ||
    path === "/verify-email" ||
    path.startsWith("/auth/employee");

  const isProtectedRoute = PROTECTED_ROUTES.some((r) => matches(path, r));

  // Redirect unauthenticated users to login if accessing protected route
  if (isProtectedRoute && !session?.user) {
    const isEmployeeRoute = path.startsWith("/employee");
    const loginUrl = new URL(isEmployeeRoute ? "/auth/employee/login" : "/login", req.url);
    loginUrl.searchParams.set("from", path);
    return NextResponse.redirect(loginUrl);
  }

  // Server-side authorization: staff-only modules require OWNER/ADMIN.
  // When a MEMBER user tries to access admin-only pages, redirect to their execution workspace.
  if (
    session?.user &&
    session.user.role === "MEMBER" &&
    STAFF_ONLY_ROUTES.some((r) => matches(path, r))
  ) {
    return NextResponse.redirect(new URL("/employee/work", req.url));
  }

  // Redirect authenticated users away from login/signup auth pages
  if (isAuthPage && session?.user) {
    if (session.user.role === "MEMBER") {
      return NextResponse.redirect(new URL("/employee/work", req.url));
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
