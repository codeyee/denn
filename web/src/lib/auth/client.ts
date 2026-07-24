import { CSRF_HEADER } from "@/lib/auth/constants";

let csrfToken: string | null = null;

export async function authMutation<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await ensureCsrfToken();
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [CSRF_HEADER]: token,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
    signal: AbortSignal.timeout(5_000),
  });
  return parseAuthResponse<T>(response);
}

export async function getCsrfHeader() {
  return { [CSRF_HEADER]: await ensureCsrfToken() };
}

async function ensureCsrfToken() {
  if (csrfToken) return csrfToken;

  const response = await fetch("/api/auth/csrf", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = await parseAuthResponse<{ csrfToken: string }>(response);
  csrfToken = payload.csrfToken;
  return csrfToken;
}

async function parseAuthResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    const message =
      typeof payload.detail === "string"
        ? payload.detail
        : typeof payload.message === "string"
          ? payload.message
          : "Authentication request failed.";
    throw new Error(message);
  }
  return payload as T;
}
