import type { ReactNode } from "react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/common/Toast";
import { trackingActions } from "@/lib/api";
import { useSetTrackingStatusMutation } from "@/lib/api/mutations";
import { queryKeys } from "@/lib/api/queries";
import {
  ContentType,
  SourceApi,
  type ContentItem,
} from "@/lib/types";

describe("tracking optimistic updates", () => {
  it("restores the viewer-scoped detail after a failed mutation", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const key = queryKeys.contentDetail.byId(42, 7, "CO");
    queryClient.setQueryData<ContentItem>(key, contentItem());
    vi.spyOn(trackingActions, "setStatus").mockRejectedValueOnce(
      new Error("offline"),
    );

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    );
    const { result } = renderHook(() => useSetTrackingStatusMutation(), {
      wrapper,
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          contentId: 42,
          status: "completed",
        }),
      ).rejects.toThrow("offline");
    });

    expect(
      queryClient.getQueryData<ContentItem>(key)?.current_user_tracking?.status,
    ).toBe("backlog");
  });
});

function contentItem(): ContentItem {
  return {
    id: 42,
    source_api: SourceApi.TMDB,
    external_id: "42",
    content_type: ContentType.MOVIE,
    rating_count: 0,
    average_rating: null,
    current_user_rating: null,
    current_user_tracking: {
      content_id: 42,
      status: "backlog",
      last_completed_at: null,
      is_favorite: false,
      favorited_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    created_at: "2026-01-01T00:00:00Z",
    source_data: null,
  };
}
