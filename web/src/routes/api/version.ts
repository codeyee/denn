import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

export function getReleaseSha() {
  const value = process.env.BUILD_SHA?.trim().toLowerCase() ?? "";
  return /^[0-9a-f]{40}$/.test(value) ? value : "unknown";
}

export function releaseVersionResponse() {
  return new Response(
    JSON.stringify({
      service: "web",
      sha: getReleaseSha(),
    }),
    {
      status: 200,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json",
      },
    },
  );
}

export const Route = createFileRoute("/api/version")({
  server: {
    handlers: {
      GET: () => releaseVersionResponse(),
    },
  },
});
