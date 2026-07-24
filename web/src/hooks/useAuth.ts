import { useAuthStore } from "@/stores/auth-store";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useCallback } from "react";

import { normalizeInternalRedirectTarget } from "@/lib/auth/redirect";

export function useAuth() {
  const navigate = useNavigate();
  const router = useRouter();
  const {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    error,
    sessionResolution,
    login,
    register,
    logout,
    clearError,
  } = useAuthStore();

  const handleLogin = useCallback(
    async (email: string, password: string, next?: string) => {
      try {
        await login(email, password);
        await router.invalidate();
        await navigate({ to: normalizeInternalRedirectTarget(next) ?? "/" });
      } catch (error) {
        console.error("Login error:", error);
      }
    },
    [login, navigate, router],
  );

  const handleRegister = useCallback(
    async (username: string, email: string, password: string) => {
      try {
        await register(username, email, password);
        await router.invalidate();
        await navigate({ to: "/" });
      } catch (error) {
        console.error("Registration error:", error);
      }
    },
    [register, navigate, router],
  );

  const handleLogout = useCallback(async () => {
    await logout();
    await navigate({ to: "/" });
    await router.invalidate();
  }, [logout, navigate, router]);

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    error,
    sessionResolution,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    clearError,
  };
}
