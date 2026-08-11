import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Business OS — Proxy (middleware)
 *
 * Protects authenticated routes and redirects authenticated users
 * away from public auth pages.
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

  // Protected routes requiring authentication
  const isProtectedRoute =
    path.startsWith("/dashboard") || path.startsWith("/onboarding");

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