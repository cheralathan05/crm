import { NextResponse } from "next/server";

export function ok<T>(data: T) {
  return NextResponse.json({ ok: true, ...data } as T & { ok: true });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export function unauthorized(message = "Authentication required.") {
  return fail(message, 401);
}

export function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      ok: false,
      message: "Too many attempts. Try again shortly.",
      retryAfter: retryAfterSeconds,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}

export function withSetCookies(response: NextResponse, source: Response) {
  if (typeof source.headers.getSetCookie === "function") {
    for (const cookie of source.headers.getSetCookie()) {
      response.headers.append("Set-Cookie", cookie);
    }
  } else {
    const cookie = source.headers.get("set-cookie");
    if (cookie) response.headers.append("Set-Cookie", cookie);
  }
  return response;
}
