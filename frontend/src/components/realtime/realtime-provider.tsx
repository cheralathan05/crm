"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface RealtimeContextType {
  connected: boolean;
  lastEvent: any | null;
}

const RealtimeContext = createContext<RealtimeContextType>({
  connected: false,
  lastEvent: null,
});

export function RealtimeProvider({
  children,
  token,
}: {
  children: React.ReactNode;
  token?: string;
}) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<any | null>(null);

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    function connect() {
      const url = token ? `/api/realtime?token=${encodeURIComponent(token)}` : "/api/realtime";
      try {
        es = new EventSource(url);

        es.addEventListener("connected", () => {
          setConnected(true);
        });

        es.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            setLastEvent(data);
          } catch {}
        };

        es.onerror = () => {
          setConnected(false);
          if (es) {
            es.close();
            es = null;
          }
          // Exponential backoff reconnect
          reconnectTimeout = setTimeout(connect, 5000);
        };
      } catch {
        setConnected(false);
      }
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (es) es.close();
    };
  }, [token]);

  return (
    <RealtimeContext.Provider value={{ connected, lastEvent }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
