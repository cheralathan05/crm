/**
 * Business OS — Scalable Realtime Event Hub
 *
 * Scopes events strictly by workspace, project, or user ID.
 * Decouples publishers from active SSE client connections.
 */

export interface RealtimeMessage {
  id: string;
  scope: string; // e.g. "workspace:ws123", "project:proj456", "user:user789"
  event: string; // e.g. "task:updated", "payment:confirmed", "message:received"
  payload: any;
  timestamp: number;
}

type ClientCallback = (msg: RealtimeMessage) => void;

interface Subscription {
  clientId: string;
  scopes: Set<string>;
  send: ClientCallback;
}

class RealtimeHub {
  private clients = new Map<string, Subscription>();
  private scopeIndex = new Map<string, Set<string>>(); // scope -> Set<clientId>
  private totalDispatched = 0;

  /**
   * Register a new client connection with its authorized scopes.
   */
  register(clientId: string, scopes: string[], send: ClientCallback): void {
    const scopeSet = new Set(scopes);
    this.clients.set(clientId, { clientId, scopes: scopeSet, send });

    for (const s of scopes) {
      if (!this.scopeIndex.has(s)) {
        this.scopeIndex.set(s, new Set());
      }
      this.scopeIndex.get(s)!.add(clientId);
    }
  }

  /**
   * Remove a client connection on disconnect.
   */
  unregister(clientId: string): void {
    const sub = this.clients.get(clientId);
    if (!sub) return;

    for (const s of sub.scopes) {
      const set = this.scopeIndex.get(s);
      if (set) {
        set.delete(clientId);
        if (set.size === 0) {
          this.scopeIndex.delete(s);
        }
      }
    }

    this.clients.delete(clientId);
  }

  /**
   * Publish an event to all clients authorized for this scope.
   */
  broadcast(scope: string, event: string, payload: any): void {
    const clientIds = this.scopeIndex.get(scope);
    if (!clientIds || clientIds.size === 0) return;

    const message: RealtimeMessage = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      scope,
      event,
      payload,
      timestamp: Date.now(),
    };

    this.totalDispatched++;

    for (const cid of clientIds) {
      const client = this.clients.get(cid);
      if (client) {
        try {
          client.send(message);
        } catch {
          this.unregister(cid);
        }
      }
    }
  }

  /**
   * Hub telemetry and active connections.
   */
  getMetrics() {
    return {
      activeConnections: this.clients.size,
      activeChannels: this.scopeIndex.size,
      totalDispatched: this.totalDispatched,
    };
  }
}

const globalHub = globalThis as unknown as { __realtimeHub?: RealtimeHub };
export const realtimeHub = globalHub.__realtimeHub ?? (globalHub.__realtimeHub = new RealtimeHub());
