import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { realtimeHub, RealtimeMessage } from "@/lib/realtime/realtime-hub";
import { getWorkspaceForUser } from "@/lib/clients";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

/**
 * Business OS — Server-Sent Events (SSE) Real-time Stream
 *
 * Scopes updates strictly by authenticated workspace and user identity.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const clientId = `client_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

  // Scopes authorized for this connection
  const authorizedScopes: string[] = [];

  if (session?.user?.id) {
    authorizedScopes.push(`user:${session.user.id}`);
    const workspace = await getWorkspaceForUser(session.user.id);
    if (workspace) {
      authorizedScopes.push(`workspace:${workspace.id}`);
    }
  } else {
    // Optional public token-based scope for client portal review/payment pages
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (token) {
      authorizedScopes.push(`portal:${token}`);
    }
  }

  if (authorizedScopes.length === 0) {
    return NextResponse.json({ ok: false, message: "Authentication required" }, { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection packet
      const initData = JSON.stringify({
        connected: true,
        clientId,
        scopes: authorizedScopes,
        timestamp: Date.now(),
      });
      controller.enqueue(encoder.encode(`event: connected\ndata: ${initData}\n\n`));

      // Register with RealtimeHub
      realtimeHub.register(clientId, authorizedScopes, (msg: RealtimeMessage) => {
        try {
          const packet = `event: ${msg.event}\ndata: ${JSON.stringify(msg)}\n\n`;
          controller.enqueue(encoder.encode(packet));
        } catch {
          realtimeHub.unregister(clientId);
        }
      });

      // Keepalive heartbeat ping every 25 seconds
      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeatTimer);
          realtimeHub.unregister(clientId);
        }
      }, 25000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeatTimer);
        realtimeHub.unregister(clientId);
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      realtimeHub.unregister(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable buffering in Nginx reverse proxies
    },
  });
}
