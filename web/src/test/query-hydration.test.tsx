import { QueryClient, QueryClientProvider, dehydrate, hydrate, useQuery } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/lib/api/queries";

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 60_000,
      },
    },
  });
}

function HydratedProbe({ queryFn }: { queryFn: () => Promise<string> }) {
  const query = useQuery({
    queryKey: queryKeys.suggestions.byParams({ limit: 20, country: "CO" }),
    queryFn,
    staleTime: 60_000,
  });

  return <div>{query.data ?? "loading"}</div>;
}

describe("TanStack Query hydration", () => {
  it("does not refetch on mount when server and client keys match", async () => {
    const serverClient = createClient();

    await serverClient.prefetchQuery({
      queryKey: queryKeys.suggestions.byParams({ limit: 20, country: "CO" }),
      queryFn: async () => "server-data",
    });

    const client = createClient();
    hydrate(client, dehydrate(serverClient));

    const queryFn = vi.fn(async () => "client-data");

    render(
      <QueryClientProvider client={client}>
        <HydratedProbe queryFn={queryFn} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("server-data")).toBeInTheDocument();
    await waitFor(() => expect(queryFn).not.toHaveBeenCalled());
  });
});
