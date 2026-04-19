import { NextRequest, NextResponse } from "next/server";
import { buildProxyHeaders, generateRequestId, getProxyBaseUrl } from "@/lib/server/proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = `${getProxyBaseUrl()}/${path.join("/")}${request.nextUrl.search}`;

  const country = request.headers.get("x-user-country");
  const requestId = request.headers.get("x-request-id") ?? generateRequestId();
  const headers = buildProxyHeaders(country, { requestId });

  try {
    const response = await fetch(url, { headers });
    const data = await response.json();
    const res = NextResponse.json(data, { status: response.status });
    res.headers.set("X-Request-Id", requestId);
    return res;
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      msg: "bff_proxy_unreachable",
      request_id: requestId,
      url,
      error: error instanceof Error ? error.message : String(error),
    }));
    const res = NextResponse.json(
      {
        error: "BFF_PROXY_UNREACHABLE",
        message: "Failed to reach proxy server",
        request_id: requestId,
      },
      { status: 502 }
    );
    res.headers.set("X-Request-Id", requestId);
    return res;
  }
}
