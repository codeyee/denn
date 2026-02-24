import { NextRequest, NextResponse } from "next/server";

const PROXY_BASE_URL =
  process.env.PROXY_API_URL ||
  process.env.NEXT_PUBLIC_PROXY_API_URL ||
  "http://localhost:8080/v1/proxy";

const PROXY_API_KEY =
  process.env.PROXY_API_KEY ||
  process.env.NEXT_PUBLIC_PROXY_API_KEY ||
  "";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = `${PROXY_BASE_URL}/${path.join("/")}${request.nextUrl.search}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-Api-Key": PROXY_API_KEY,
  };

  const country = request.headers.get("x-user-country");
  if (country) headers["X-User-Country"] = country;

  try {
    const response = await fetch(url, { headers });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach proxy server" },
      { status: 502 }
    );
  }
}
