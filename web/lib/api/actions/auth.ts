import { api } from "../api";
import type {
  EmailLogin,
  Register,
  JWT,
  Profile,
  TokenRefresh,
  PasswordChange,
  PasswordReset,
  PasswordResetConfirm,
  RestAuthDetail,
} from "@/lib/types";

export const authActions = {
  login: (credentials: EmailLogin): Promise<JWT> => {
    return api.post<JWT>("/auth/login/", credentials, false);
  },

  register: (data: Register): Promise<{ user: Profile; access: string; refresh: string }> => {
    return api.post<{ user: Profile; access: string; refresh: string }>("/auth/register/", data, false);
  },

  logout: (): Promise<RestAuthDetail> => {
    return api.post<RestAuthDetail>("/auth/logout/", {}, true);
  },

  getProfile: (): Promise<Profile> => {
    return api.get<Profile>("/auth/user/", true);
  },

  updateProfile: (data: Partial<Profile>): Promise<Profile> => {
    return api.put<Profile>("/auth/user/", data, true);
  },

  patchProfile: (data: Partial<Profile>): Promise<Profile> => {
    return api.patch<Profile>("/auth/user/", data, true);
  },

  changePassword: (data: PasswordChange): Promise<RestAuthDetail> => {
    return api.post<RestAuthDetail>("/auth/password/change/", data, true);
  },

  resetPassword: (data: PasswordReset): Promise<RestAuthDetail> => {
    return api.post<RestAuthDetail>("/auth/password/reset/", data, false);
  },

  confirmPasswordReset: (data: PasswordResetConfirm): Promise<RestAuthDetail> => {
    return api.post<RestAuthDetail>("/auth/password/reset/confirm/", data, false);
  },

  refreshToken: (refresh: string): Promise<TokenRefresh> => {
    return api.post<TokenRefresh>("/auth/token/refresh/", { refresh }, false);
  },

  verifyToken: (token: string): Promise<{ detail?: string }> => {
    return api.post<{ detail?: string }>("/auth/token/verify/", { token }, false);
  },
};
