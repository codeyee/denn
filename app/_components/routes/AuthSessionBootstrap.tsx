"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/app/_stores/auth-store";
import type { SessionSnapshot } from "@/lib/auth/session-server";

interface AuthSessionBootstrapProps {
  session: SessionSnapshot;
}

export function AuthSessionBootstrap({ session }: AuthSessionBootstrapProps) {
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    setSession({
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
  }, [
    session.accessToken,
    session.refreshToken,
    session.user,
    setSession,
  ]);

  return null;
}
