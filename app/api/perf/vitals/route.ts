import { NextRequest, NextResponse } from "next/server";

/**
 * Sprint 08 / T2 — Web Vitals ingestion endpoint.
 *
 * Receives one metric per request from the browser via
 * `navigator.sendBeacon`. The payload is intentionally not persisted:
 * we just emit a structured `console.log` so whatever runtime ships
 * stdout (Vercel, container logs) captures it. Sprint 6C will decide
 * the long-term destination.
 *
 * Stays cheap on purpose: no DB, no auth, no rate-limit. Worst case a
 * misbehaving client floods our logs — easy to mitigate later by
 * gating on a header or moving to an edge function.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface VitalPayload {
  event?: string;
  name?: string;
  value?: number;
  rating?: string;
  id?: string;
  route?: string;
  ts?: number;
}

function isValidPayload(value: unknown): value is VitalPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as VitalPayload;
  return typeof v.name === "string" && typeof v.value === "number";
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isValidPayload(body)) {
    return NextResponse.json({ ok: false, error: "invalid_shape" }, { status: 400 });
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      event: "web_vital",
      name: body.name,
      value: body.value,
      rating: body.rating,
      id: body.id,
      route: body.route,
      ts: body.ts ?? Date.now(),
    }),
  );

  return NextResponse.json({ ok: true });
}
