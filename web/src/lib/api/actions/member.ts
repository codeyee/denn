import { api } from "../api";
import type { ListMember, ListMemberRole, ListMembersResponse } from "@/lib/types";

export const memberActions = {
  list: (listId: number): Promise<ListMembersResponse> => {
    return api.get<ListMembersResponse>(`/content/lists/${listId}/members/`, true);
  },

  updateRole: (
    listId: number,
    memberId: number,
    role: Exclude<ListMemberRole, "owner">,
  ): Promise<ListMember> => {
    return api.patch<ListMember>(
      `/content/lists/${listId}/members/${memberId}/`,
      { role },
      true,
    );
  },

  delete: (listId: number, memberId: number): Promise<void> => {
    return api.delete(`/content/lists/${listId}/members/${memberId}/`, true) as Promise<void>;
  },
};
