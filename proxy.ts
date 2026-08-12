import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** All authenticated application routes (dashboard modules + onboarding). */
const PROTECTED_ROUTES = [
  "/dashboard",
  "/onboarding",
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
 * Business OS — Proxy (middleware)
 *
 * Protects authenticated routes, redirects authenticated users away from
 * public auth pages, and enforces role-based access on the server.
 */
export default async function proxy(req: NextRequest) {
  const session = await auth();
  const path = req.nextUrl.pathname;

  // Public routes that unauthenticated users may access
  const isPublicRoute =
    path === "/login" ||
    path === "/signup" ||
    path === "/forgot-password" ||
    path === "/reset-password" ||
    path === "/verify-email";

  const isProtectedRoute = PROTECTED_ROUTES.some((r) => matches(path, r));

  // Auth API routes
  const isAuthApiRoute = path.startsWith("/api/auth");

  // Static assets — always pass through
  const isStatic =
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path.startsWith("/images") ||
    path === "/";

  if (isStatic || isAuthApiRoute) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (isProtectedRoute && !session?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", path);
    return NextResponse.redirect(loginUrl);
  }

  // Server-side authorization: staff-only modules require OWNER/ADMIN.
  // The sidebar hides these for members, but the backend enforces it too.
  if (
    session?.user &&
    session.user.role === "MEMBER" &&
    STAFF_ONLY_ROUTES.some((r) => matches(path, r))
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Redirect authenticated users away from auth pages — "/" resolves the
  // correct destination (onboarding or dashboard) from the user's state.
  if (isPublicRoute && session?.user) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
