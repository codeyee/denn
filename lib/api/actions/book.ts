import { api } from "../api";
import type {
  BookSearchResponse,
  BookDetail,
  BulkBooksResponse,
  BookSearchParams,
} from "@/lib/types";

export const bookActions = {
  search: (params: BookSearchParams, signal?: AbortSignal): Promise<BookSearchResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("query", params.query);
    if (params.page) queryParams.append("page", String(params.page));
    if (params.page_size) queryParams.append("page_size", String(params.page_size));

    return api.get<BookSearchResponse>(
      `/proxy/books/search?${queryParams}`,
      true,
      signal
    );
  },

  getBook: (bookId: string): Promise<BookDetail> => {
    return api.get<BookDetail>(`/proxy/books/${bookId}`, true);
  },

  bulkGetBooks: (ids: string[]): Promise<BulkBooksResponse> => {
    const params = new URLSearchParams();
    params.append("ids", ids.join(","));
    return api.get<BulkBooksResponse>(`/proxy/books/bulk?${params}`, true);
  },
};
