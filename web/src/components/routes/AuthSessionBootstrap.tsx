
import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import type { SessionSnapshot } from "@/server/session";

interface AuthSessionBootstrapProps {
  session: SessionSnapshot;
}

export function AuthSessionBootstrap({ session }: AuthSessionBootstrapProps) {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setSessionResolution = useAuthStore(
    (state) => state.setSessionResolution,
  );

  useEffect(() => {
    if (session.resolution === "unavailable") {
      setSessionResolution("unavailable");
      return;
    }

    // The server detected that the refresh failed and the cookies are now
    // stale (see resolveSession in lib/auth/session-server.ts). Clear the
    // client-side state and the non-HttpOnly cookies so the next navigation
    // does not re-attempt auth with a known-dead token.
    if (session.needsCookieSync && !session.accessToken) {
      clearSession();
      return;
    }

    setSession({
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
  }, [
    session.accessToken,
    session.refreshToken,
    session.user,
    session.needsCookieSync,
    session.resolution,
    setSession,
    clearSession,
    setSessionResolution,
  ]);

  return null;
}
