import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const similar = searchParams.get("similar");
  const patterns = searchParams.get("patterns");

  try {
    if (similar === "true") {
      const res = await fetch(`${BACKEND_URL}/api/incidents/similar`);
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    if (patterns === "true") {
      const res = await fetch(`${BACKEND_URL}/api/incidents/patterns`);
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    const res = await fetch(`${BACKEND_URL}/api/incidents`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { query } = body;

  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/incidents/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Backend unavailable", data: { incidents: [], regulations: [], summary: "Backend not reachable" } },
      { status: 503 }
    );
  }
}
