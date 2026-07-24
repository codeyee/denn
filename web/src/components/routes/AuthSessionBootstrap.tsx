
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
    if (
      session.resolution === "unavailable" ||
      session.resolution === "timeout"
    ) {
      setSessionResolution(session.resolution);
      return;
    }

    if (session.resolution === "expired") {
      clearSession();
      setSessionResolution("expired");
      return;
    }

    setSession({
      user: session.user,
    });
  }, [
    session.user,
    session.resolution,
    setSession,
    clearSession,
    setSessionResolution,
  ]);

  return null;
}
