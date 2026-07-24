import { api } from "../api";
import type {
  Profile,
  PasswordChange,
  PasswordReset,
  PasswordResetConfirm,
  RestAuthDetail,
} from "@/lib/types";

export const authActions = {
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
};
