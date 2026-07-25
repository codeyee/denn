import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { authMutation } from "@/lib/auth/client";

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  allow_adult_content?: boolean;
  bio?: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
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
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  logoutEverywhere: () => Promise<void>;
  setUser: (user: User | null) => void;
  setSession: (session: { user: User | null }) => void;
  clearSession: () => void;
  clearError: () => void;
  setSessionResolution: (
    resolution: AuthState["sessionResolution"],
  ) => void;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  sessionResolution: "pending",
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,
      isLoading: true,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = await authMutation<{ user: User }>(
            "/api/auth/login",
            { email, password },
          );
          setAuthenticatedUser(set, user);
        } catch (error) {
          setAuthError(set, error, "An error occurred during login");
          throw error;
        }
      },

      register: async (username, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = await authMutation<{ user: User }>(
            "/api/auth/register",
            {
              username,
              email,
              password,
              password_confirm: password,
            },
          );
          setAuthenticatedUser(set, user);
        } catch (error) {
          setAuthError(set, error, "An error occurred during registration");
          throw error;
        }
      },

      logout: async () => {
        await authMutation("/api/auth/logout");
        setAnonymous(set);
      },

      logoutEverywhere: async () => {
        await authMutation("/api/auth/logout-all");
        setAnonymous(set);
      },

      setUser: (user) => {
        set({
          user,
          isAuthenticated: Boolean(user),
        });
      },

      setSession: ({ user }) => {
        set({
          user,
          isAuthenticated: Boolean(user),
          isLoading: false,
          error: null,
          sessionResolution: user ? "authenticated" : "anonymous",
        });
      },

      clearSession: () => {
        setAnonymous(set);
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
            useAuthStore.setState((current) => ({
              isLoading: false,
              sessionResolution:
                current.sessionResolution === "pending"
                  ? "anonymous"
                  : current.sessionResolution,
            }));
          }, 0);
        };
      },
    },
  ),
);

type StoreSetter = (
  partial:
    | Partial<AuthStore>
    | ((state: AuthStore) => Partial<AuthStore>),
) => void;

function setAuthenticatedUser(set: StoreSetter, user: User) {
  set({
    user,
    isAuthenticated: true,
    isLoading: false,
    error: null,
    sessionResolution: "authenticated",
  });
}

function setAnonymous(set: StoreSetter) {
  set({
    ...initialState,
    isLoading: false,
    sessionResolution: "anonymous",
  });
}

function setAuthError(
  set: StoreSetter,
  error: unknown,
  fallback: string,
) {
  set({
    error: error instanceof Error ? error.message : fallback,
    isLoading: false,
  });
}
