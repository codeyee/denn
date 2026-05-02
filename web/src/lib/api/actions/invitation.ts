import { api } from "../api";
import { buildQueryString } from "../utils/queryParams";
import type {
  ListInvitation,
  PaginatedListInvitationList,
  ListInvitationCreate,
  InvitationQueryParams,
} from "@/lib/types";

export const invitationActions = {
  list: (params?: InvitationQueryParams): Promise<PaginatedListInvitationList> => {
    const query = buildQueryString({ params });
    return api.get<PaginatedListInvitationList>(`/content/invitations/${query}`, true);
  },

  get: (id: number): Promise<ListInvitation> => {
    return api.get<ListInvitation>(`/content/invitations/${id}/`, true);
  },

  send: (listId: number, data: ListInvitationCreate): Promise<ListInvitation> => {
    return api.post<ListInvitation>(
      `/content/lists/${listId}/invitations/`,
      data,
      true
    );
  },

  respond: (id: number, action: "accept" | "reject"): Promise<unknown> => {
    return api.post(`/content/invitations/${id}/respond/`, { action }, true);
  },

  delete: (id: number): Promise<void> => {
    return api.delete(`/content/invitations/${id}/`, true) as Promise<void>;
  },

  listForList: (listId: number, params?: InvitationQueryParams): Promise<PaginatedListInvitationList> => {
    const query = buildQueryString({ params });
    return api.get<PaginatedListInvitationList>(
      `/content/lists/${listId}/invitations/${query}`,
      true
    );
  },
};
