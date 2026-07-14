import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const zoneId = searchParams.get("zone_id");
  const history = searchParams.get("history");
  const anomalies = searchParams.get("anomalies");

  let path = "/api/sensors";
  if (anomalies === "true") path += "/anomalies";
  else if (zoneId && history === "true") path += `/${zoneId}/history`;
  else if (zoneId) path += `/${zoneId}`;
  else path += "/current";

  try {
    const res = await fetch(`${BACKEND_URL}${path}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
}
