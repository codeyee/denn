import { createFileRoute, notFound } from "@tanstack/react-router";

import { ModerationPreviewPage } from "@/components/pages/ModerationPreviewPage";

function ModerationPreviewRoute() {
  const { country } = Route.useRouteContext();
  return <ModerationPreviewPage country={country ?? undefined} />;
}

export const Route = createFileRoute("/dev/moderation-preview")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: ModerationPreviewRoute,
});
