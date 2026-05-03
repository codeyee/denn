
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/auth-store";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Component to protect routes that require authentication
 * Redirects to login page if user is not authenticated
 */
export function ProtectedRoute({ 
  children,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, sessionResolution } = useAuth();
  const accessToken = useAuthStore((state) => state.accessToken);
  const navigate = useNavigate();
  const location = useLocation({
    select: (loc) => ({ pathname: loc.pathname, searchStr: loc.searchStr }),
  });
  const bootStartedAtRef = useRef<number | null>(null);
  const bootWarnedRef = useRef(false);

  // Hydration window: zustand-persist restored `isAuthenticated: true` from
  // localStorage, but <AuthSessionBootstrap /> in the root layout hasn't yet
  // copied the auth cookies into the store. Without this guard the protected
  // children would mount, fire authed fetches with no Authorization header,
  // get 401s, fail the refresh path with "No refresh token available", and
  // bounce the user back to /login on every hard refresh.
  const isBootingSession = isAuthenticated && !accessToken;

  useEffect(() => {
    if (!isLoading && !isAuthenticated && sessionResolution !== "unavailable") {
      void navigate({
        to: "/login",
        search: {
          next: `${location.pathname}${location.searchStr || ""}`,
        },
      });
    }
  }, [
    isAuthenticated,
    isLoading,
    location.pathname,
    location.searchStr,
    navigate,
    sessionResolution,
  ]);

  useEffect(() => {
    if (!isBootingSession) {
      if (bootStartedAtRef.current !== null) {
        const durationMs = Math.round(performance.now() - bootStartedAtRef.current);
        if (durationMs > 200 && !bootWarnedRef.current) {
          console.warn(
            JSON.stringify({
              event: "slow_session_bootstrap",
              path: `${location.pathname}${location.searchStr || ""}`,
              duration_ms: durationMs,
              resolution: sessionResolution,
            }),
          );
        }
      }
      bootStartedAtRef.current = null;
      bootWarnedRef.current = false;
      return;
    }

    if (bootStartedAtRef.current === null) {
      bootStartedAtRef.current = performance.now();
      bootWarnedRef.current = false;
    }

    const timer = window.setTimeout(() => {
      if (!bootWarnedRef.current && bootStartedAtRef.current !== null) {
        const durationMs = Math.round(performance.now() - bootStartedAtRef.current);
        console.warn(
          JSON.stringify({
            event: "slow_session_bootstrap",
            path: `${location.pathname}${location.searchStr || ""}`,
            duration_ms: durationMs,
            resolution: sessionResolution,
          }),
        );
        bootWarnedRef.current = true;
      }
    }, 200);

    const hardTimeout = window.setTimeout(() => {
      console.error(
        JSON.stringify({
          event: "stuck_session_bootstrap",
          path: `${location.pathname}${location.searchStr || ""}`,
          duration_ms: 5000,
        }),
      );
      useAuthStore.getState().clearSession();
      void navigate({ to: "/login" });
    }, 5000);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(hardTimeout);
    };
  }, [
    isBootingSession,
    location.pathname,
    location.searchStr,
    navigate,
    sessionResolution,
  ]);

  if (isLoading || isBootingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (sessionResolution === "unavailable") {
      return (
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold">Service unavailable</h1>
            <p className="mt-3 text-sm text-gray-400">
              Denn could not verify your session right now. Retry in a moment.
            </p>
          </div>
        </div>
      );
    }
    return null;
  }

  return <>{children}</>;
}
