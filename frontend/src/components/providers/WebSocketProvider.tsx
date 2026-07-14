"use client";
import { useEffect, type ReactNode } from "react";
import { wsClient } from "@/lib/websocket";

export function WebSocketProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    wsClient.connect();
    return () => wsClient.disconnect();
  }, []);
  return <>{children}</>;
}
