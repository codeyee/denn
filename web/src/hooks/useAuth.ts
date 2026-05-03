import { useAuthStore } from "@/stores/auth-store";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import { normalizeInternalRedirectTarget } from "@/lib/auth/redirect";

export function useAuth() {
  const navigate = useNavigate();
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
        void navigate({ to: normalizeInternalRedirectTarget(next) ?? "/" });
      } catch (error) {
        console.error("Login error:", error);
      }
    },
    [login, navigate],
  );

  const handleRegister = useCallback(
    async (username: string, email: string, password: string) => {
      try {
        await register(username, email, password);
        void navigate({ to: "/" });
      } catch (error) {
        console.error("Registration error:", error);
      }
    },
    [register, navigate],
  );

  const handleLogout = useCallback(async () => {
    await logout();
    void navigate({ to: "/" });
  }, [logout, navigate]);

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
