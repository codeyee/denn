import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  clearError: () => void;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          // Replace with your actual API endpoint
          const response = await fetch(`${apiUrl}/auth/login/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Login failed");
          }

          const data = await response.json();

          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
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
          // Replace with your actual API endpoint
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
          });

          if (!response.ok) {
            const errorData = await response.json();

            const errorMessage =
              errorData.message || Object.values(errorData).flat().join(" ");

            throw new Error(errorMessage);
          }

          const data = await response.json();

          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
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

      logout: () => {
        set(initialState);
      },

      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },

      setToken: (token: string | null) => {
        set({ token });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
