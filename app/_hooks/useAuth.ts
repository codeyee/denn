"use client";

import { useAuthStore } from "@/app/_stores/auth-store";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Custom hook for authentication
 * Provides a convenient interface for auth operations
 */
export function useAuth() {
  const router = useRouter();
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  } = useAuthStore();

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      try {
        await login(email, password);
        router.push("/"); // Redirect after successful login
      } catch (error) {
        // Error is already set in the store
        console.error("Login error:", error);
      }
    },
    [login, router]
  );

  const handleRegister = useCallback(
    async (username: string, email: string, password: string) => {
      try {
        await register(username, email, password);
        router.push("/"); // Redirect after successful registration
      } catch (error) {
        // Error is already set in the store
        console.error("Registration error:", error);
      }
    },
    [register, router]
  );

  const handleLogout = useCallback(() => {
    logout();
    router.push("/login"); // Redirect to login page after logout
  }, [logout, router]);

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    clearError,
  };
}
