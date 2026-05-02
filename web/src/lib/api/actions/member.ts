import { api } from "../api";
import type { User } from "@/lib/types";

export const memberActions = {
  list: (listId: number): Promise<User[]> => {
    return api.get<User[]>(`/content/lists/${listId}/members/`, true);
  },

  delete: (listId: number, memberId: number): Promise<void> => {
    return api.delete(`/content/lists/${listId}/members/${memberId}/`, true) as Promise<void>;
  },
};
