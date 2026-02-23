import { proxyApi } from "../proxyApi";
import type {
  BookSearchResponse,
  BookDetail,
  BulkBooksResponse,
  BookSearchParams,
} from "@/lib/types";

export const bookActions = {
  search: (params: BookSearchParams, signal?: AbortSignal): Promise<BookSearchResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("q", params.q);
    if (params.page) queryParams.append("page", String(params.page));
    if (params.limit) queryParams.append("limit", String(params.limit));

    return proxyApi.get<BookSearchResponse>(`/books?${queryParams}`, { signal });
  },

  getBook: (bookId: string): Promise<BookDetail> => {
    return proxyApi.get<BookDetail>(`/books/${bookId}`);
  },

  bulkGetBooks: (ids: string[]): Promise<BulkBooksResponse> => {
    return proxyApi.get<BulkBooksResponse>(`/books/bulk?ids=${ids.join(",")}`);
  },
};
