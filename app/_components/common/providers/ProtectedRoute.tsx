"use client";

import { useAuth } from "@/app/_hooks/useAuth";
import { useAuthStore } from "@/app/_stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Component to protect routes that require authentication
 * Redirects to login page if user is not authenticated
 */
export function ProtectedRoute({ 
  children, 
  redirectTo = "/login" 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const accessToken = useAuthStore((state) => state.accessToken);
  const router = useRouter();

  // Hydration window: zustand-persist restored `isAuthenticated: true` from
  // localStorage, but <AuthSessionBootstrap /> in the root layout hasn't yet
  // copied the auth cookies into the store. Without this guard the protected
  // children would mount, fire authed fetches with no Authorization header,
  // get 401s, fail the refresh path with "No refresh token available", and
  // bounce the user back to /login on every hard refresh.
  const isBootingSession = isAuthenticated && !accessToken;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  if (isLoading || isBootingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
