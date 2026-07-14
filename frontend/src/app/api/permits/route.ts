import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const active = searchParams.get("active");
  const conflicts = searchParams.get("conflicts");
  const simops = searchParams.get("simops");

  try {
    if (simops === "true") {
      const res = await fetch(`${BACKEND_URL}/api/permits/simops`);
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    if (conflicts === "true") {
      const res = await fetch(`${BACKEND_URL}/api/permits/conflicts`);
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    const params = new URLSearchParams();
    if (active) params.set("active", "true");
    const qs = params.toString();
    const res = await fetch(`${BACKEND_URL}/api/permits${qs ? `?${qs}` : ""}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, permitId } = body;

  try {
    if (action === "suspend" && permitId) {
      const res = await fetch(`${BACKEND_URL}/api/permits/${permitId}/suspend`, { method: "POST" });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
}
