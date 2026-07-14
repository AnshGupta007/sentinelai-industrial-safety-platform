import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams();
  if (searchParams.get("active")) params.set("active", "true");
  if (searchParams.get("severity")) params.set("severity", searchParams.get("severity")!);
  const qs = params.toString();

  try {
    const res = await fetch(`${BACKEND_URL}/api/alerts${qs ? `?${qs}` : ""}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, alertId } = body;

  try {
    if (action === "acknowledge" && alertId) {
      const res = await fetch(`${BACKEND_URL}/api/alerts/${alertId}/acknowledge`, { method: "POST" });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    if (action === "resolve" && alertId) {
      const res = await fetch(`${BACKEND_URL}/api/alerts/${alertId}/resolve`, { method: "POST" });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    if (action === "suspend_permits" && alertId) {
      const alertRes = await fetch(`${BACKEND_URL}/api/alerts`);
      const alertData = await alertRes.json();
      const alerts = alertData.data || [];
      const alert = alerts.find((a: { alertId: string }) => a.alertId === alertId);
      if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });
      const res = await fetch(`${BACKEND_URL}/api/emergency/suspend-permits/${alert.zoneId}`, { method: "POST" });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    if (action === "evacuate" && alertId) {
      const alertRes = await fetch(`${BACKEND_URL}/api/alerts`);
      const alertData = await alertRes.json();
      const alerts = alertData.data || [];
      const alert = alerts.find((a: { alertId: string }) => a.alertId === alertId);
      if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });
      const res = await fetch(`${BACKEND_URL}/api/emergency/evacuate/${alert.zoneId}`, { method: "POST" });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
}
