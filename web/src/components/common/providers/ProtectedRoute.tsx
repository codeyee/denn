
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/auth-store";
import { useLocation, useNavigate, useRouter } from "@tanstack/react-router";
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
  const navigate = useNavigate();
  const router = useRouter();
  const location = useLocation({
    select: (loc) => ({ pathname: loc.pathname, searchStr: loc.searchStr }),
  });
  const bootStartedAtRef = useRef<number | null>(null);
  const bootWarnedRef = useRef(false);
  const redirectStartedRef = useRef(false);

  // Hydration window: Zustand restored the last non-sensitive user snapshot,
  // but the server has not yet confirmed the HttpOnly-cookie session.
  const isBootingSession =
    isAuthenticated &&
    sessionResolution === "pending";
  const isDegradedSession =
    (sessionResolution === "unavailable" ||
      sessionResolution === "timeout");

  useEffect(() => {
    if (
      !isLoading &&
      !isAuthenticated &&
      (sessionResolution === "anonymous" ||
        sessionResolution === "expired")
    ) {
      if (redirectStartedRef.current) return;
      redirectStartedRef.current = true;
      void navigate({
        to: "/login",
        search: {
          next: `${location.pathname}${location.searchStr || ""}`,
        },
      });
      return;
    }
    if (isAuthenticated) redirectStartedRef.current = false;
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
      useAuthStore.getState().setSessionResolution("timeout");
    }, 5000);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(hardTimeout);
    };
  }, [
    isBootingSession,
    location.pathname,
    location.searchStr,
    sessionResolution,
  ]);

  if (isLoading || isBootingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"
          role="status"
          aria-label="Verifying session"
        />
      </div>
    );
  }

  if (isDegradedSession) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">
            {sessionResolution === "timeout"
              ? "Session check timed out"
              : "Service unavailable"}
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            Your session was kept intact. Retry when the service is reachable.
          </p>
          <button
            type="button"
            className="mt-6 min-h-11 rounded-md bg-primary px-5 py-2 text-primary-foreground focus-visible:ring-4 focus-visible:ring-white/80"
            onClick={() => {
              useAuthStore.getState().setSessionResolution("pending");
              void router.invalidate();
            }}
          >
            Retry session check
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
