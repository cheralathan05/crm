import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

/* ────────────────────────────────────────────────────────────────
   BUSINESS OS — RFC 7807 PRODUCTION ERROR FRAMEWORK
   Safe public error serialization, unique tracking Error IDs,
   and confidential internal stack trace logging.
──────────────────────────────────────────────────────────────── */

export interface AppErrorOptions {
  status?: number;
  code?: string;
  details?: Record<string, any>;
  cause?: unknown;
}

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly errorId: string;
  public readonly details?: Record<string, any>;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = "AppError";
    this.status = options.status ?? 500;
    this.code = options.code ?? "INTERNAL_SERVER_ERROR";
    this.errorId = `ERR-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
    this.details = options.details;
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Transforms any caught error into a standardized production-safe JSON response.
 * Never leaks raw SQL or database internal stack traces to the public client.
 */
export function handleApiError(err: unknown, routeName = "API"): NextResponse {
  const errorId = `ERR-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const now = new Date().toISOString();

  if (err instanceof AppError) {
    console.error(`[${routeName}] [${err.errorId}] Client Error ${err.status} (${err.code}):`, err.message);
    return NextResponse.json(
      {
        ok: false,
        errorId: err.errorId,
        code: err.code,
        message: err.message,
        timestamp: now,
        details: err.details,
      },
      { status: err.status }
    );
  }

  // Unhandled / Internal exception
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(`[${routeName}] [${errorId}] Critical Exception:`, message, stack);

  // In production, mask raw message
  const publicMessage =
    process.env.NODE_ENV === "production"
      ? `An unexpected system error occurred. Please reference tracking Error ID: ${errorId}`
      : message;

  return NextResponse.json(
    {
      ok: false,
      errorId,
      code: "INTERNAL_SERVER_ERROR",
      message: publicMessage,
      timestamp: now,
    },
    { status: 500 }
  );
}
