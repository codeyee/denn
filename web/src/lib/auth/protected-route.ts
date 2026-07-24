import { redirect } from "@tanstack/react-router";

import type { SessionSnapshot } from "@/server/session";

function buildRedirectTarget(pathname: string, searchStr: string) {
  return `${pathname}${searchStr || ""}`;
}

export function requireAuthenticatedSession(
  session: SessionSnapshot,
  pathname: string,
  searchStr = "",
) {
  if (
    session.resolution === "anonymous" ||
    session.resolution === "expired"
  ) {
    throw redirect({
      to: "/login",
      search: {
        next: buildRedirectTarget(pathname, searchStr),
      },
    });
  }
}
