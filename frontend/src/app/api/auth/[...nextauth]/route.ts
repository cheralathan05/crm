import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const { GET, POST: nextAuthPOST } = handlers;

export { GET };

/**
 * Rate-limit credential sign-in attempts before delegating to Auth.js.
 * Only the /api/auth/callback/credentials path is throttled — session
 * refresh (/session) and sign-out POSTs pass straight through so they
 * never consume the login bucket.
 *
 * The 429 body includes an absolute login URL with `error`/`code` params so
 * the next-auth/react client `signIn` parser (`new URL(data.url)`) can
 * surface a proper rate-limit code instead of throwing.
 */
export async function POST(request: NextRequest) {
  const isCredentialsCallback = request.nextUrl.pathname.endsWith("/callback/credentials");
  if (isCredentialsCallback) {
    const rl = await rateLimit(10, 60_000, "login-callback");
    if (!rl.ok) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "CredentialsSignin");
      loginUrl.searchParams.set("code", "RateLimit");
      return NextResponse.json(
        {
          ok: false,
          message: "Too many attempts. Try again shortly.",
          url: loginUrl.toString(),
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }
  }
  return nextAuthPOST(request);
}
