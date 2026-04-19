import { ContentDetailSkeleton } from "@/app/_components/pages/ContentDetailPage/ContentDetailSkeleton";

/**
 * Sprint 08 / T5 — Next.js App Router automatic loading UI.
 *
 * Rendered by the framework as the Suspense boundary fallback during
 * navigation to `/content/[id]/`. Replaces the previous spinner with
 * a dimensioned skeleton so:
 *   - the document length is stable from frame 1,
 *   - LCP is the skeleton banner block, which is paintable instantly,
 *   - and the swap to real content is invisible (no CLS).
 */
export default function Loading() {
  return <ContentDetailSkeleton />;
}
