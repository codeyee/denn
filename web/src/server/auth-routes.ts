import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
} from "@/lib/auth/constants";
import { getApiUrl } from "@/lib/env";
import type { Profile } from "@/lib/types";
import {
  clearAuthCookies,
  extractUpstreamCookie,
  getAccessToken,
  getRefreshToken,
  setAuthCookies,
} from "@/server/auth-cookies";
import { getLogicalRequestId } from "@/server/proxy";
import {
  readLimitedJson,
  RequestBodyTooLargeError,
} from "@/server/request-security";

interface AuthSuccessPayload {
  user: Profile;
  access: string;
  refresh: string;
}

export function jsonResponse(
  data: unknown,
  status: number,
  headers: HeadersInit = {},
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json",
      ...headers,
    },
  });
}

export function csrfFailure() {
  return jsonResponse(
    { error: "CSRF_FAILED", detail: "Invalid or missing CSRF token." },
    403,
  );
}

export async function createAuthenticatedSession(
  request: Request,
  endpoint: "login" | "register",
) {
  let body: unknown;
  try {
    body = await readLimitedJson(request, 16_384);
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof RequestBodyTooLargeError
            ? "REQUEST_TOO_LARGE"
            : "INVALID_JSON",
        detail:
          error instanceof RequestBodyTooLargeError
            ? "Request body is too large."
            : "Request body must be valid JSON.",
      },
      error instanceof RequestBodyTooLargeError ? 413 : 400,
    );
  }

  const requestId = getLogicalRequestId();
  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}/auth/${endpoint}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "auth_upstream_unavailable",
        request_id: requestId,
        endpoint,
        error:
          error instanceof Error ? error.name : "UnknownError",
      }),
    );
    return jsonResponse(
      {
        error: "AUTH_UPSTREAM_UNAVAILABLE",
        detail: "Authentication service is temporarily unavailable.",
      },
      502,
      { "x-request-id": requestId },
    );
  }
  const payload = (await response.json().catch(() => ({}))) as Partial<
    AuthSuccessPayload
  >;

  if (!response.ok) {
    return jsonResponse(payload, response.status, {
      "x-request-id": requestId,
    });
  }

  const access =
    extractUpstreamCookie(response, AUTH_ACCESS_COOKIE) ?? payload.access;
  const refresh =
    extractUpstreamCookie(response, AUTH_REFRESH_COOKIE) ?? payload.refresh;
  if (!payload.user || !access || !refresh) {
    clearAuthCookies();
    return jsonResponse(
      {
        error: "INVALID_AUTH_RESPONSE",
        detail: "Authentication service returned an incomplete session.",
      },
      502,
      { "x-request-id": requestId },
    );
  }

  setAuthCookies({ access, refresh });
  return jsonResponse({ user: payload.user }, response.status, {
    "x-request-id": requestId,
  });
}

export async function destroyAuthenticatedSession(everywhere: boolean) {
  const access = getAccessToken();
  const refresh = getRefreshToken();
  const endpoint = everywhere ? "logout-all" : "logout";

  try {
    if (access) {
      await fetch(`${getApiUrl()}/auth/${endpoint}/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access}`,
          "Content-Type": "application/json",
          "X-Request-Id": getLogicalRequestId(),
        },
        body: JSON.stringify(refresh ? { refresh } : {}),
        cache: "no-store",
        signal: AbortSignal.timeout(3_000),
      });
    }
  } finally {
    clearAuthCookies();
  }

  return jsonResponse(
    {
      detail: everywhere
        ? "Signed out from all sessions."
        : "Successfully signed out.",
    },
    200,
  );
}
