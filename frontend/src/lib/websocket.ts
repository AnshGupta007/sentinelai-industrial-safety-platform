import type { Alert, Permit, EmergencyResponse } from "./types";

type WSEventCallback = (data: unknown) => void;

interface WSEventMap {
  sensor_update: { zone_id: string; sensor_id: string; value: number; timestamp: string };
  risk_update: { zone_id: string; score: number; level: string };
  alert_new: Alert;
  permit_flagged: Permit;
  emergency_triggered: EmergencyResponse;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Map<string, Set<WSEventCallback>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  constructor(url?: string) {
    this.url = url || process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    try {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => { /* connected */ };
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const { event: eventType, data } = msg;
          const cbs = this.listeners.get(eventType);
          if (cbs) cbs.forEach((cb) => cb(data));
        } catch {}
      };
      this.ws.onclose = () => {
        if (this.shouldReconnect) {
          this.reconnectTimer = setTimeout(() => this.connect(), 3000);
        }
      };
      this.ws.onerror = () => this.ws?.close();
    } catch {}
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  on<K extends keyof WSEventMap>(event: K, callback: (data: WSEventMap[K]) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback as WSEventCallback);
  }

  off<K extends keyof WSEventMap>(event: K, callback: (data: WSEventMap[K]) => void) {
    this.listeners.get(event)?.delete(callback as WSEventCallback);
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsClient = new WebSocketClient();
