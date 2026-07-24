import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { clearAuthCookies, syncAuthCookies } from "@/lib/auth/session-client";

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  allow_adult_content?: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionResolution:
    | "pending"
    | "anonymous"
    | "authenticated"
    | "expired"
    | "unavailable"
    | "timeout";
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setSession: (session: {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
  }) => void;
  setAccessToken: (accessToken: string | null) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  clearSession: () => void;
  clearError: () => void;
  setSessionResolution: (
    resolution: AuthState["sessionResolution"],
  ) => void;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  sessionResolution: "pending",
};

import { getApiUrl } from "@/lib/env";

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,
      isLoading: true,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const apiUrl = getApiUrl();
          const response = await fetch(`${apiUrl}/auth/login/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
            signal: AbortSignal.timeout(5_000),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || errorData.message || "Login failed");
          }

          const data = await response.json();

          set({
            user: data.user,
            accessToken: data.access,
            refreshToken: data.refresh,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            sessionResolution: "authenticated",
          });
          syncAuthCookies({
            accessToken: data.access,
            refreshToken: data.refresh,
          });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "An error occurred during login",
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const apiUrl = getApiUrl();
          const response = await fetch(`${apiUrl}/auth/register/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username,
              email,
              password,
              password_confirm: password,
            }),
            signal: AbortSignal.timeout(5_000),
          });

          if (!response.ok) {
            const errorData = await response.json();

            const errorMessage =
              errorData.detail ||
              errorData.message ||
              Object.values(errorData).flat().join(" ");

            throw new Error(errorMessage);
          }

          const data = await response.json();

          set({
            user: data.user,
            accessToken: data.access,
            refreshToken: data.refresh,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            sessionResolution: "authenticated",
          });
          syncAuthCookies({
            accessToken: data.access,
            refreshToken: data.refresh,
          });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "An error occurred during registration",
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          const state = useAuthStore.getState();
          const apiUrl = getApiUrl();
          if (state.accessToken) {
            // Call the logout endpoint to invalidate the token
            await fetch(`${apiUrl}/auth/logout/`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${state.accessToken}`,
              },
              body: JSON.stringify({
                refresh: state.refreshToken,
              }),
            });
          }
        } catch (error) {
          console.error("Logout error:", error);
        } finally {
          clearAuthCookies();
          set({
            ...initialState,
            isLoading: false,
            sessionResolution: "anonymous",
          });
        }
      },

      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },

      setSession: ({ user, accessToken, refreshToken }) => {
        if (accessToken || refreshToken) {
          syncAuthCookies({ accessToken, refreshToken });
        } else {
          clearAuthCookies();
        }

        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: Boolean(user && accessToken),
          isLoading: false,
          error: null,
          sessionResolution:
            user && accessToken ? "authenticated" : "anonymous",
        });
      },

      setAccessToken: (accessToken: string | null) => {
        syncAuthCookies({
          accessToken,
          refreshToken: useAuthStore.getState().refreshToken,
        });
        set({ accessToken });
      },

      setRefreshToken: (refreshToken: string | null) => {
        syncAuthCookies({
          accessToken: useAuthStore.getState().accessToken,
          refreshToken,
        });
        set({ refreshToken });
      },

      clearSession: () => {
        clearAuthCookies();
        set({
          ...initialState,
          isLoading: false,
          sessionResolution: "anonymous",
        });
      },

      clearError: () => {
        set({ error: null });
      },

      setSessionResolution: (sessionResolution) => {
        set({
          sessionResolution,
          isLoading: false,
        });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      // Phase 1 of .docs/adr/0002-web-auth-cookies.md: stop persisting JWTs
      // to localStorage. The tokens still live in (non-HttpOnly) cookies and
      // are re-hydrated server-side via resolveSession() + AuthSessionBootstrap
      // on every navigation, so removing them from localStorage does not
      // break SSR-protected routes.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error("Error rehydrating auth store:", error);
          }
          setTimeout(() => {
            useAuthStore.setState((state) => ({
              isLoading: false,
              sessionResolution:
                state.sessionResolution === "pending"
                  ? "anonymous"
                  : state.sessionResolution,
            }));
          }, 0);
        };
      },
    }
  )
);
