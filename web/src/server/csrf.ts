import { getCookie } from "@tanstack/react-start/server";

import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/auth/constants";

export function validateCsrfRequest(request: Request): boolean {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  const cookieToken = getCookie(CSRF_COOKIE) ?? "";
  const headerToken = request.headers.get(CSRF_HEADER) ?? "";
  return constantTimeEqual(cookieToken, headerToken);
}

function constantTimeEqual(left: string, right: string) {
  if (left.length < 32 || left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
